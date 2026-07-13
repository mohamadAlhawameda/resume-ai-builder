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

const LANGUAGE_NAMES = { en: 'English', ar: 'Arabic (Modern Standard Arabic)', fr: 'French' };

/**
 * Every AI content route passes the resume/profile's language through here so
 * output language is consistent everywhere without editing each prompt by
 * hand. Proper nouns, company names, and widely-used English tech terms
 * (e.g. "React", "AWS") should stay as commonly written by professionals in
 * that language — not force-translated into awkward equivalents.
 */
function withLanguage(system, language) {
  if (!language || language === 'en') return system;
  const name = LANGUAGE_NAMES[language] || language;
  return `${system}\n\nRespond entirely in ${name}. Keep widely-used English product/technology names and proper nouns (e.g. company names, "React", "AWS") as commonly written by professionals — do not force-translate them.`;
}

/**
 * Run a completion that must return JSON. Returns the parsed object or throws.
 */
export async function chatJSON({ system, user, maxTokens = 900, language }) {
  if (!client) throw new Error('AI is not configured');
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: withLanguage(system, language) },
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
export async function chatText({ system, user, maxTokens = 700, language }) {
  if (!client) throw new Error('AI is not configured');
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: withLanguage(system, language) },
      { role: 'user', content: user },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content?.trim() || '';
}
