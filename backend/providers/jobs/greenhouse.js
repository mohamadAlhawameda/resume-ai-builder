// Greenhouse public job-board provider.
// Uses the official public Job Board API (no key required):
//   https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true
// Configure with GREENHOUSE_BOARDS=board1,board2 (the board token from a
// company's careers page URL). This is a legitimate public API — not scraping.

import { findSkillsInText } from '../../utils/text.js';
import { prettyCompanyName } from './companyName.js';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout.js';
import { stripHtml } from '../../utils/htmlToText.js';

const greenhouseProvider = {
  name: 'greenhouse',
  isConfigured: () => !!process.env.GREENHOUSE_BOARDS,

  async fetchJobs() {
    const boards = (process.env.GREENHOUSE_BOARDS || '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    // Fetch every board concurrently — sequential awaits here would mean N
    // boards pay N round-trips end-to-end instead of just the slowest one.
    const settled = await Promise.allSettled(
      boards.map(async (board) => {
        const res = await fetchWithTimeout(
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`,
          { timeoutMs: 8000 }
        );
        if (!res.ok) {
          console.warn(`Greenhouse board "${board}" returned ${res.status}`);
          return [];
        }
        const data = await res.json();
        return (data.jobs || []).map((job) => {
          const description = stripHtml(job.content || '').slice(0, 6000);
          return {
            id: `greenhouse:${board}:${job.id}`,
            provider: 'greenhouse',
            source: 'Greenhouse',
            externalId: String(job.id),
            title: job.title || 'Untitled role',
            company: job.company_name || prettyCompanyName(board),
            location: job.location?.name || 'Not specified',
            remote: /remote/i.test(job.location?.name || '') ? 'remote' : 'unknown',
            workType: 'full-time',
            salaryMin: null,
            salaryMax: null,
            url: job.absolute_url || '',
            postedAt: job.updated_at || null,
            description,
            skills: findSkillsInText(`${job.title} ${description}`).slice(0, 12),
            isSampleData: false,
          };
        });
      })
    );

    const results = [];
    for (const [i, s] of settled.entries()) {
      if (s.status === 'fulfilled') results.push(...s.value);
      else console.warn(`Greenhouse fetch failed for board "${boards[i]}":`, s.reason?.message);
    }
    return results;
  },
};

export default greenhouseProvider;
