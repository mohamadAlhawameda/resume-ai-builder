// Lever public postings provider.
// Uses the official public Postings API (no key required):
//   https://api.lever.co/v0/postings/{company}?mode=json
// Configure with LEVER_COMPANIES=company1,company2 (the slug from a company's
// jobs.lever.co URL). This is a legitimate public API — not scraping.

import { findSkillsInText } from '../../utils/text.js';

function toPlainText(posting) {
  const parts = [posting.descriptionPlain || ''];
  for (const list of posting.lists || []) {
    parts.push(list.text || '');
    const items = (list.content || '')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<[^>]+>/g, '');
    parts.push(items);
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

    const results = [];
    for (const company of companies) {
      try {
        const res = await fetch(
          `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`
        );
        if (!res.ok) {
          console.warn(`Lever company "${company}" returned ${res.status}`);
          continue;
        }
        const postings = await res.json();
        for (const p of postings || []) {
          const description = toPlainText(p).slice(0, 6000);
          const workStyle = (p.workplaceType || '').toLowerCase();
          results.push({
            id: `lever:${company}:${p.id}`,
            provider: 'lever',
            externalId: p.id,
            title: p.text || 'Untitled role',
            company,
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
          });
        }
      } catch (err) {
        console.warn(`Lever fetch failed for company "${company}":`, err.message);
      }
    }
    return results;
  },
};

export default leverProvider;
