// Central OpenAI wrapper. All AI generation goes through here so we can:
//  - degrade gracefully when OPENAI_API_KEY is missing (deterministic fallbacks)
//  - cap input sizes to control cost and prevent prompt abuse
//  - keep prompts server-side (clients send structured fields, never raw prompts)

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export const aiAvailable = () => !!client;

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/** Trim user-provided text to a safe size before it enters a prompt. */
export function truncate(text, max = 4000) {
  if (typeof text !== 'string') return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Run a completion that must return JSON. Returns the parsed object or throws.
 */
export async function chatJSON({ system, user, maxTokens = 900 }) {
  if (!client) throw new Error('AI is not configured');
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });
  const raw = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(raw);
}

/** Plain-text completion. */
export async function chatText({ system, user, maxTokens = 700 }) {
  if (!client) throw new Error('AI is not configured');
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}
