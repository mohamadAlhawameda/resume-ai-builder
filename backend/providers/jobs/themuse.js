// The Muse public jobs API.
// Uses the official public API (no key required): https://www.themuse.com/api/public/jobs
// This is a legitimate public API — not scraping. The Muse itself aggregates
// postings across many curated companies, so no per-company config is
// needed; it's on by default (set THEMUSE_ENABLED=false to opt out).
//
// The API paginates ~20 jobs/page across thousands of pages; we only pull a
// handful of pages per fetch to stay a well-behaved client rather than
// pulling their entire catalog on every cache refresh.
import { findSkillsInText } from '../../utils/text.js';
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

const PAGES_TO_FETCH = 3;

const themuseProvider = {
  name: 'themuse',
  isConfigured: () => process.env.THEMUSE_ENABLED !== 'false',

  async fetchJobs() {
    const results = [];
    for (let page = 0; page < PAGES_TO_FETCH; page++) {
      try {
        const res = await fetchWithTimeout(`https://www.themuse.com/api/public/jobs?page=${page}`, { timeoutMs: 8000 });
        if (!res.ok) {
          console.warn(`The Muse page ${page} returned ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const job of data.results || []) {
          const description = stripHtml(job.contents || '').slice(0, 6000);
          const location = (job.locations || []).map((l) => l.name).filter(Boolean).join('; ') || 'Not specified';
          const isRemote = /remote|flexible/i.test(location);
          results.push({
            id: `themuse:${job.id}`,
            provider: 'themuse',
            source: 'The Muse',
            externalId: String(job.id),
            title: job.name || 'Untitled role',
            company: job.company?.name || 'Unknown company',
            location,
            remote: isRemote ? 'remote' : 'unknown',
            workType: 'full-time',
            salaryMin: null,
            salaryMax: null,
            url: job.refs?.landing_page || '',
            postedAt: job.publication_date || null,
            description,
            skills: (job.tags?.length ? job.tags.map((t) => t.name).filter(Boolean) : findSkillsInText(`${job.name} ${description}`)).slice(0, 12),
            isSampleData: false,
          });
        }
        if (!data.results || data.results.length === 0) break;
      } catch (err) {
        console.warn(`The Muse fetch failed for page ${page}:`, err.message);
      }
    }
    return results;
  },
};

export default themuseProvider;
