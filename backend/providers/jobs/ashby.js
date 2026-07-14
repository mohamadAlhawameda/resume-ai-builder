// Ashby public job-board provider.
// Uses the official public Job Board API (no key required):
//   https://api.ashbyhq.com/posting-api/job-board/{boardName}
// Configure with ASHBY_BOARDS=org1,org2 (the org slug from a company's
// jobs.ashbyhq.com/{org} URL). This is a legitimate public API — not scraping.

import { findSkillsInText } from '../../utils/text.js';
import { prettyCompanyName } from './companyName.js';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout.js';

function stripHtml(html = '') {
  return html
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

    const results = [];
    for (const board of boards) {
      try {
        const res = await fetchWithTimeout(
          `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
          { timeoutMs: 8000 }
        );
        if (!res.ok) {
          console.warn(`Ashby board "${board}" returned ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const job of data.jobs || []) {
          if (job.isListed === false) continue;
          const description = stripHtml(job.descriptionHtml || '').slice(0, 6000);
          results.push({
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
          });
        }
      } catch (err) {
        console.warn(`Ashby fetch failed for board "${board}":`, err.message);
      }
    }
    return results;
  },
};

export default ashbyProvider;
