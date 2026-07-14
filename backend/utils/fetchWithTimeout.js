// Shared timeout wrapper for outbound requests to job-board APIs. One slow
// or hung upstream board must never stall the whole aggregation — each
// request gets its own budget and is aborted cleanly if it's exceeded.
export async function fetchWithTimeout(url, { timeoutMs = 8000, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
