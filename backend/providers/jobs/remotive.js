// Remotive public remote-jobs API.
// Uses the official public API (no key required): https://remotive.com/api/remote-jobs
// This is a legitimate public API — not scraping. Remotive itself aggregates
// remote postings across many companies, so no per-company config is needed;
// it's on by default (set REMOTIVE_ENABLED=false to opt out).
//
// Remotive's API response includes a usage notice: "we advise max. 4 times a
// day... excessive requests will be blocked", and asks that listings link
// back to Remotive as the source. We honor both — a long-lived internal
// cache (independent of the shared job cache) keeps real request volume well
// under that limit, and every job keeps its Remotive apply URL + `source`.
import { findSkillsInText } from '../../utils/text.js';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout.js';
import { stripHtml } from '../../utils/htmlToText.js';

const JOB_TYPE_MAP = {
  full_time: 'full-time',
  part_time: 'part-time',
  contract: 'contract',
  freelance: 'contract',
  internship: 'internship',
};

// Independent, long-lived cache — refetches at most a handful of times a day
// regardless of how often the shared job cache (10 min TTL) is invalidated.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h → at most 4 fetches/day
let cache = { at: 0, jobs: [] };

const remotiveProvider = {
  name: 'remotive',
  isConfigured: () => process.env.REMOTIVE_ENABLED !== 'false',

  async fetchJobs() {
    const now = Date.now();
    if (cache.jobs.length > 0 && now - cache.at < CACHE_TTL_MS) {
      return cache.jobs;
    }
    try {
      const res = await fetchWithTimeout('https://remotive.com/api/remote-jobs', { timeoutMs: 8000 });
      if (!res.ok) {
        console.warn(`Remotive returned ${res.status}`);
        return cache.jobs;
      }
      const data = await res.json();
      const jobs = (data.jobs || []).map((job) => {
        const description = stripHtml(job.description || '').slice(0, 6000);
        return {
          id: `remotive:${job.id}`,
          provider: 'remotive',
          source: 'Remotive',
          externalId: String(job.id),
          title: job.title || 'Untitled role',
          company: job.company_name || 'Unknown company',
          location: job.candidate_required_location || 'Remote',
          remote: 'remote',
          workType: JOB_TYPE_MAP[job.job_type] || 'full-time',
          salaryMin: null,
          salaryMax: null,
          url: job.url || '',
          postedAt: job.publication_date || null,
          description,
          skills: (job.tags?.length ? job.tags : findSkillsInText(`${job.title} ${description}`)).slice(0, 12),
          isSampleData: false,
        };
      });
      cache = { at: now, jobs };
      return jobs;
    } catch (err) {
      console.warn('Remotive fetch failed:', err.message);
      return cache.jobs;
    }
  },
};

export default remotiveProvider;
