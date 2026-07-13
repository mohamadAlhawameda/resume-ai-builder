// Job provider registry.
//
// Adding a provider: create a module exporting { name, isConfigured(), fetchJobs() }
// that returns normalized jobs (see mock.js for the shape) and register it below.
// Real providers activate automatically once their env vars are present;
// otherwise the mock provider supplies clearly-flagged development data.

import mockProvider from './mock.js';
import greenhouseProvider from './greenhouse.js';
import leverProvider from './lever.js';
import { parseJobLocation, allowedCountries } from '../../utils/jobLocation.js';

const REAL_PROVIDERS = [greenhouseProvider, leverProvider];

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
  const settled = await Promise.allSettled(providers.map((p) => p.fetchJobs()));
  const jobs = normalizeGeography(
    settled.filter((s) => s.status === 'fulfilled').flatMap((s) => s.value)
  );

  if (jobs.length > 0) {
    cache = { at: now, jobs };
  }
  return jobs.length > 0 ? jobs : cache.jobs;
}
