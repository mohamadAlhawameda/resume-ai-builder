// Groq adapter — free-tier backup. Groq's API is OpenAI-compatible, so this
// reuses the `openai` SDK pointed at Groq's endpoint instead of pulling in a
// second HTTP client.

import OpenAI from 'openai';
import { withLanguage } from './shared.js';

const apiKey = process.env.GROQ_API_KEY;
const client = apiKey ? new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' }) : null;
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export const name = 'groq';
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
