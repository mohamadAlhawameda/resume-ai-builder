// Central AI wrapper. All AI generation goes through here so we can:
//  - degrade gracefully when no provider is configured (deterministic fallbacks)
//  - cap input sizes to control cost and prevent prompt abuse
//  - keep prompts server-side (clients send structured fields, never raw prompts)
//  - fall back across providers (OpenAI → Groq → Gemini) if the active one
//    errors — quota exhausted, outage, missing key — instead of failing the
//    request outright.

import * as openai from './providers/openai.js';
import * as groq from './providers/groq.js';
import * as gemini from './providers/gemini.js';

// Priority order: paid OpenAI first (if configured), then free backups.
const providers = [openai, groq, gemini].filter((provider) => provider.configured());

export const aiAvailable = () => providers.length > 0;

/** Trim user-provided text to a safe size before it enters a prompt. */
export function truncate(text, max = 4000) {
  if (typeof text !== 'string') return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function withFallback(method, opts) {
  if (providers.length === 0) throw new Error('AI is not configured');
  let lastError;
  for (const provider of providers) {
    try {
      return await provider[method](opts);
    } catch (error) {
      lastError = error;
      console.error(`[ai] ${provider.name}.${method} failed, trying next provider:`, error.message);
    }
  }
  throw lastError;
}

/** Run a completion that must return JSON. Returns the parsed object or throws. */
export function chatJSON(opts) {
  return withFallback('chatJSON', opts);
}

/** Plain-text completion. */
export function chatText(opts) {
  return withFallback('chatText', opts);
}
