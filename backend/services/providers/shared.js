// Helpers shared by every AI provider adapter.

export const LANGUAGE_NAMES = { en: 'English', ar: 'Arabic (Modern Standard Arabic)', fr: 'French' };

/**
 * Every AI content route passes the resume/profile's language through here so
 * output language is consistent everywhere without editing each prompt by
 * hand. Proper nouns, company names, and widely-used English tech terms
 * (e.g. "React", "AWS") should stay as commonly written by professionals in
 * that language — not force-translated into awkward equivalents.
 */
export function withLanguage(system, language) {
  if (!language || language === 'en') return system;
  const name = LANGUAGE_NAMES[language] || language;
  return `${system}\n\nRespond entirely in ${name}. Keep widely-used English product/technology names and proper nouns (e.g. company names, "React", "AWS") as commonly written by professionals — do not force-translate them.`;
}

/** Parse a model's JSON reply, tolerating ```json fences some providers add despite JSON-mode requests. */
export function parseJSON(raw) {
  const text = (raw || '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Model did not return valid JSON');
  }
}
