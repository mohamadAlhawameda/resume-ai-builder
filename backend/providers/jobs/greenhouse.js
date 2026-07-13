// Greenhouse public job-board provider.
// Uses the official public Job Board API (no key required):
//   https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true
// Configure with GREENHOUSE_BOARDS=board1,board2 (the board token from a
// company's careers page URL). This is a legitimate public API — not scraping.

import { findSkillsInText } from '../../utils/text.js';
import { prettyCompanyName } from './companyName.js';

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

const greenhouseProvider = {
  name: 'greenhouse',
  isConfigured: () => !!process.env.GREENHOUSE_BOARDS,

  async fetchJobs() {
    const boards = (process.env.GREENHOUSE_BOARDS || '')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    const results = [];
    for (const board of boards) {
      try {
        const res = await fetch(
          `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`
        );
        if (!res.ok) {
          console.warn(`Greenhouse board "${board}" returned ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const job of data.jobs || []) {
          const description = stripHtml(job.content || '').slice(0, 6000);
          results.push({
            id: `greenhouse:${board}:${job.id}`,
            provider: 'greenhouse',
            externalId: String(job.id),
            title: job.title || 'Untitled role',
            company: prettyCompanyName(board),
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
          });
        }
      } catch (err) {
        console.warn(`Greenhouse fetch failed for board "${board}":`, err.message);
      }
    }
    return results;
  },
};

export default greenhouseProvider;
