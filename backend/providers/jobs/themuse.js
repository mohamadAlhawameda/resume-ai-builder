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
    // Fetch all pages concurrently — sequential awaits here would mean each
    // page pays its own round-trip end-to-end instead of just the slowest one.
    const settled = await Promise.allSettled(
      Array.from({ length: PAGES_TO_FETCH }, (_, page) =>
        fetchWithTimeout(`https://www.themuse.com/api/public/jobs?page=${page}`, { timeoutMs: 8000 }).then(async (res) => {
          if (!res.ok) {
            console.warn(`The Muse page ${page} returned ${res.status}`);
            return [];
          }
          const data = await res.json();
          return (data.results || []).map((job) => {
            const description = stripHtml(job.contents || '').slice(0, 6000);
            const location = (job.locations || []).map((l) => l.name).filter(Boolean).join('; ') || 'Not specified';
            const isRemote = /remote|flexible/i.test(location);
            return {
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
            };
          });
        })
      )
    );

    const results = [];
    for (const [page, s] of settled.entries()) {
      if (s.status === 'fulfilled') results.push(...s.value);
      else console.warn(`The Muse fetch failed for page ${page}:`, s.reason?.message);
    }
    return results;
  },
};

export default themuseProvider;
