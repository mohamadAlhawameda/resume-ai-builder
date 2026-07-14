// Lever public postings provider.
// Uses the official public Postings API (no key required):
//   https://api.lever.co/v0/postings/{company}?mode=json
// Configure with LEVER_COMPANIES=company1,company2 (the slug from a company's
// jobs.lever.co URL). This is a legitimate public API — not scraping.

import { findSkillsInText } from '../../utils/text.js';
import { prettyCompanyName } from './companyName.js';
import { fetchWithTimeout } from '../../utils/fetchWithTimeout.js';
import { stripHtml } from '../../utils/htmlToText.js';

function toPlainText(posting) {
  // descriptionPlain/list.text are already plain text from Lever's API;
  // list.content is real (single-encoded) HTML and needs stripping.
  const parts = [posting.descriptionPlain || ''];
  for (const list of posting.lists || []) {
    parts.push(list.text || '');
    parts.push(stripHtml(list.content || ''));
  }
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const leverProvider = {
  name: 'lever',
  isConfigured: () => !!process.env.LEVER_COMPANIES,

  async fetchJobs() {
    const companies = (process.env.LEVER_COMPANIES || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    // Fetch every company concurrently — sequential awaits here would mean N
    // companies pay N round-trips end-to-end instead of just the slowest one.
    const settled = await Promise.allSettled(
      companies.map(async (company) => {
        const res = await fetchWithTimeout(
          `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`,
          { timeoutMs: 8000 }
        );
        if (!res.ok) {
          console.warn(`Lever company "${company}" returned ${res.status}`);
          return [];
        }
        const postings = await res.json();
        return (postings || []).map((p) => {
          const description = toPlainText(p).slice(0, 6000);
          const workStyle = (p.workplaceType || '').toLowerCase();
          return {
            id: `lever:${company}:${p.id}`,
            provider: 'lever',
            source: 'Lever',
            externalId: p.id,
            title: p.text || 'Untitled role',
            company: prettyCompanyName(company),
            location: p.categories?.location || 'Not specified',
            remote: workStyle === 'remote' ? 'remote' : workStyle === 'hybrid' ? 'hybrid' : workStyle === 'on-site' ? 'onsite' : 'unknown',
            workType: (p.categories?.commitment || 'full-time').toLowerCase(),
            salaryMin: p.salaryRange?.min ?? null,
            salaryMax: p.salaryRange?.max ?? null,
            url: p.hostedUrl || '',
            postedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
            description,
            skills: findSkillsInText(`${p.text} ${description}`).slice(0, 12),
            isSampleData: false,
            // ISO country code straight from the Lever API — authoritative
            // even when the display location is just "Hybrid"/"In-Office".
            countryHint: p.country || '',
          };
        });
      })
    );

    const results = [];
    for (const [i, s] of settled.entries()) {
      if (s.status === 'fulfilled') results.push(...s.value);
      else console.warn(`Lever fetch failed for company "${companies[i]}":`, s.reason?.message);
    }
    return results;
  },
};

export default leverProvider;
