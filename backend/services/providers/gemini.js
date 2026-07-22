// Google Gemini adapter — free-tier backup via a Google AI Studio API key.
// Plain REST call — no SDK dependency needed since Node 18+ has global fetch.

import { withLanguage, parseJSON } from './shared.js';

const apiKey = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

export const name = 'gemini';
export const configured = () => !!apiKey;

async function generate({ system, user, maxTokens, language, temperature, json }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: withLanguage(system, language) }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        // Newer Gemini flash models "think" before answering by default,
        // which can silently eat the whole maxOutputTokens budget and
        // truncate the real answer. We just want direct output here.
        thinkingConfig: { thinkingLevel: 'low' },
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
}

export async function chatJSON({ system, user, maxTokens = 900, language }) {
  const raw = await generate({ system, user, maxTokens, language, temperature: 0.6, json: true });
  return parseJSON(raw);
}

export async function chatText({ system, user, maxTokens = 700, language }) {
  const raw = await generate({ system, user, maxTokens, language, temperature: 0.7, json: false });
  return raw.trim();
}
