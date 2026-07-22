// OpenAI adapter — the primary (paid) provider.

import OpenAI from 'openai';
import { withLanguage } from './shared.js';

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const name = 'openai';
export const configured = () => !!client;

export async function chatJSON({ system, user, maxTokens = 900, language }) {
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

export async function chatText({ system, user, maxTokens = 700, language }) {
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
