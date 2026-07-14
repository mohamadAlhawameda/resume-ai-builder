// Ashby public job-board provider.
// Uses the official public Job Board API (no key required):
//   https://api.ashbyhq.com/posting-api/job-board/{boardName}
// Configure with ASHBY_BOARDS=org1,org2 (the org slug from a company's
// jobs.ashbyhq.com/{org} URL). This is a legitimate public API — not scraping.

import { findSkillsInText } from '../../utils/text.js';
import { prettyCompanyName } from './companyName.js';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout.js';
import { stripHtml } from '../../utils/htmlToText.js';

const WORKPLACE_TO_REMOTE = { Remote: 'remote', Hybrid: 'hybrid', OnSite: 'onsite' };
const EMPLOYMENT_TO_WORKTYPE = { FullTime: 'full-time', PartTime: 'part-time', Contract: 'contract', Intern: 'internship' };

const ashbyProvider = {
  name: 'ashby',
  isConfigured: () => !!process.env.ASHBY_BOARDS,

  async fetchJobs() {
    const boards = (process.env.ASHBY_BOARDS || '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    // Fetch every board concurrently — sequential awaits here would mean N
    // boards pay N round-trips end-to-end instead of just the slowest one.
    const settled = await Promise.allSettled(
      boards.map(async (board) => {
        const res = await fetchWithTimeout(
          `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
          { timeoutMs: 8000 }
        );
        if (!res.ok) {
          console.warn(`Ashby board "${board}" returned ${res.status}`);
          return [];
        }
        const data = await res.json();
        return (data.jobs || [])
          .filter((job) => job.isListed !== false)
          .map((job) => {
            const description = stripHtml(job.descriptionHtml || '').slice(0, 6000);
            return {
              id: `ashby:${board}:${job.id}`,
              provider: 'ashby',
              source: 'Ashby',
              externalId: job.id,
              title: job.title || 'Untitled role',
              company: prettyCompanyName(board),
              location: job.location || job.secondaryLocations?.[0]?.location || 'Not specified',
              remote: WORKPLACE_TO_REMOTE[job.workplaceType] || (job.isRemote ? 'remote' : 'unknown'),
              workType: EMPLOYMENT_TO_WORKTYPE[job.employmentType] || 'full-time',
              salaryMin: null,
              salaryMax: null,
              url: job.applyUrl || job.jobUrl || '',
              postedAt: job.publishedAt || null,
              description,
              skills: findSkillsInText(`${job.title} ${description}`).slice(0, 12),
              isSampleData: false,
              countryHint: job.address?.postalAddress?.addressCountry === 'United States' ? 'US'
                : job.address?.postalAddress?.addressCountry === 'Canada' ? 'CA' : '',
            };
          });
      })
    );

    const results = [];
    for (const [i, s] of settled.entries()) {
      if (s.status === 'fulfilled') results.push(...s.value);
      else console.warn(`Ashby fetch failed for board "${boards[i]}":`, s.reason?.message);
    }
    return results;
  },
};

export default ashbyProvider;
