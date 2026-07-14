// Job provider registry.
//
// Adding a provider: create a module exporting { name, isConfigured(), fetchJobs() }
// that returns normalized jobs (see mock.js for the shape) and register it below.
// Real providers activate automatically once their env vars are present;
// otherwise the mock provider supplies clearly-flagged development data.

import mockProvider from './mock.js';
import greenhouseProvider from './greenhouse.js';
import leverProvider from './lever.js';
import ashbyProvider from './ashby.js';
import { parseJobLocation, allowedCountries } from '../../utils/jobLocation.js';

const REAL_PROVIDERS = [greenhouseProvider, leverProvider, ashbyProvider];

// Attach normalized geography and drop postings outside the served markets
// (JOB_COUNTRIES, default US + Canada; set to "all" to disable).
function normalizeGeography(rawJobs) {
  const allowed = allowedCountries();
  const jobs = [];
  for (const raw of rawJobs) {
    const { countryHint, ...job } = raw;
    const { countries, regions } = parseJobLocation(job.location, countryHint);
    if (allowed && !countries.some((c) => allowed.has(c))) continue;
    jobs.push({ ...job, countries, regions });
  }
  return jobs;
}

// Different boards occasionally list the exact same posting (e.g. a company
// cross-posts to two boards, or a role is duplicated internally). Dedupe by
// a normalized title+company+location fingerprint, keeping the first seen.
function dedupeJobs(jobs) {
  const seen = new Set();
  const out = [];
  for (const job of jobs) {
    const key = `${job.title}|${job.company}|${job.location}`.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}

// Feeds are cached briefly so repeated dashboard/job-page loads stay fast and
// we stay respectful of upstream APIs.
const CACHE_TTL_MS = 10 * 60 * 1000;
let cache = { at: 0, jobs: [] };

export function activeProviders() {
  const configured = REAL_PROVIDERS.filter((p) => p.isConfigured());
  return configured.length > 0 ? configured : [mockProvider];
}

export function usingSampleData() {
  return REAL_PROVIDERS.every((p) => !p.isConfigured());
}

export async function fetchAllJobs({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.jobs.length > 0 && now - cache.at < CACHE_TTL_MS) {
    return cache.jobs;
  }
  const providers = activeProviders();
  // Each provider already times out its own upstream requests (see
  // fetchWithTimeout); allSettled means one provider failing entirely still
  // lets the others through — graceful fallback, never a hard failure.
  const settled = await Promise.allSettled(providers.map((p) => p.fetchJobs()));
  for (const [i, s] of settled.entries()) {
    if (s.status === 'rejected') console.warn(`Job provider "${providers[i].name}" failed:`, s.reason?.message);
  }
  const jobs = dedupeJobs(
    normalizeGeography(settled.filter((s) => s.status === 'fulfilled').flatMap((s) => s.value))
  );

  if (jobs.length > 0) {
    cache = { at: now, jobs };
  }
  return jobs.length > 0 ? jobs : cache.jobs;
}

/** Look up a single job by id from the current cache (used for lazy full-
 * description loading) — refreshes the cache first if it's gone stale. */
export async function getJobById(id) {
  const jobs = await fetchAllJobs();
  return jobs.find((j) => j.id === id) || null;
}
