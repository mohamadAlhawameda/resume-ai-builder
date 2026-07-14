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
import remotiveProvider from './remotive.js';
import arbeitnowProvider from './arbeitnow.js';
import themuseProvider from './themuse.js';
import { parseJobLocation, allowedCountries } from '../../utils/jobLocation.js';

const REAL_PROVIDERS = [
  greenhouseProvider,
  leverProvider,
  ashbyProvider,
  remotiveProvider,
  arbeitnowProvider,
  themuseProvider,
];

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

// If two callers both see a stale/empty cache at the same moment (e.g. the
// background warm-up racing a real request right after boot), they'd
// otherwise each kick off a full multi-provider fetch. Sharing one in-flight
// promise means the second caller just waits on the first's result.
let inFlight = null;

export async function fetchAllJobs({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.jobs.length > 0 && now - cache.at < CACHE_TTL_MS) {
    return cache.jobs;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      return await fetchAllJobsUncached();
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

async function fetchAllJobsUncached() {
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
    cache = { at: Date.now(), jobs };
  }
  return jobs.length > 0 ? jobs : cache.jobs;
}

/** Look up a single job by id from the current cache (used for lazy full-
 * description loading) — refreshes the cache first if it's gone stale. */
export async function getJobById(id) {
  const jobs = await fetchAllJobs();
  return jobs.find((j) => j.id === id) || null;
}

// Without this, whichever user's request happens to land right after the
// cache's 10-minute TTL expires pays the full cost of re-fetching all
// providers synchronously (up to several seconds). Refreshing proactively in
// the background means requests almost always hit an already-warm cache.
let backgroundRefreshStarted = false;
export function startBackgroundJobRefresh() {
  if (backgroundRefreshStarted) return;
  backgroundRefreshStarted = true;
  fetchAllJobs({ force: true }).catch((err) => console.warn('Initial job cache warm-up failed:', err.message));
  const REFRESH_INTERVAL_MS = CACHE_TTL_MS - 60 * 1000; // refresh just before the cache would expire
  setInterval(() => {
    fetchAllJobs({ force: true }).catch((err) => console.warn('Background job cache refresh failed:', err.message));
  }, REFRESH_INTERVAL_MS);
}
