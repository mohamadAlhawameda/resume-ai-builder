// Arbeitnow public job-board API.
// Uses the official public API (no key required): https://www.arbeitnow.com/api/job-board-api
// This is a legitimate public API — not scraping. Arbeitnow itself aggregates
// postings across many companies (Europe-heavy, some remote/global), so no
// per-company config is needed; it's on by default (set ARBEITNOW_ENABLED=false
// to opt out). Their terms ask only that listings link back to the site,
// which every job here does via its own apply `url`.
//
// Note: most Arbeitnow postings are EU-based on-site roles, so under this
// app's default US/CA-only market filter (JOB_COUNTRIES), only postings that
// explicitly mention the US, Canada, North America, or "Worldwide" survive.
// Set JOB_COUNTRIES=all to see its full (mostly European) breadth.
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

function mapWorkType(jobTypes = []) {
  const s = jobTypes.join(' ').toLowerCase();
  if (s.includes('part')) return 'part-time';
  if (s.includes('contract') || s.includes('freelance')) return 'contract';
  if (s.includes('intern')) return 'internship';
  return 'full-time';
}

const arbeitnowProvider = {
  name: 'arbeitnow',
  isConfigured: () => process.env.ARBEITNOW_ENABLED !== 'false',

  async fetchJobs() {
    try {
      const res = await fetchWithTimeout('https://www.arbeitnow.com/api/job-board-api', { timeoutMs: 8000 });
      if (!res.ok) {
        console.warn(`Arbeitnow returned ${res.status}`);
        return [];
      }
      const data = await res.json();
      return (data.data || []).map((job) => {
        const description = stripHtml(job.description || '').slice(0, 6000);
        const location = job.location || (job.remote ? 'Remote' : 'Not specified');
        return {
          id: `arbeitnow:${job.slug}`,
          provider: 'arbeitnow',
          source: 'Arbeitnow',
          externalId: job.slug,
          title: job.title || 'Untitled role',
          company: job.company_name || 'Unknown company',
          location,
          remote: job.remote ? 'remote' : 'unknown',
          workType: mapWorkType(job.job_types),
          salaryMin: null,
          salaryMax: null,
          url: job.url || '',
          postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
          description,
          skills: (job.tags?.length ? job.tags : findSkillsInText(`${job.title} ${description}`)).slice(0, 12),
          isSampleData: false,
        };
      });
    } catch (err) {
      console.warn('Arbeitnow fetch failed:', err.message);
      return [];
    }
  },
};

export default arbeitnowProvider;
