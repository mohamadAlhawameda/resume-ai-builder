// Locale parity guard: every key present in English must exist in Arabic and
// French (and vice versa), including nested namespaces. This is the single
// most common i18n regression — someone adds a key to en.json and forgets
// the other two — and it fails silently at runtime (t() returns the key).
import { describe, it, expect } from 'vitest';
import en from './messages/en.json';
import ar from './messages/ar.json';
import fr from './messages/fr.json';

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flatten(value as Record<string, unknown>, path);
    }
    return [path];
  });
}

const enKeys = new Set(flatten(en));

describe('i18n message parity', () => {
  it.each([
    ['ar', ar],
    ['fr', fr],
  ])('%s has exactly the same keys as en', (_name, messages) => {
    const keys = new Set(flatten(messages as Record<string, unknown>));
    const missing = [...enKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !enKeys.has(k));
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it('placeholders match across locales', () => {
    // A key translated with different {placeholders} than English will crash
    // or render garbage at runtime.
    const getPlaceholders = (s: unknown) =>
      typeof s === 'string' ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : [];
    const lookup = (obj: Record<string, unknown>, path: string) =>
      path.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], obj);

    for (const key of enKeys) {
      const expected = getPlaceholders(lookup(en, key));
      for (const [name, messages] of [
        ['ar', ar],
        ['fr', fr],
      ] as const) {
        const actual = getPlaceholders(lookup(messages, key));
        expect(actual, `${name}: ${key}`).toEqual(expected);
      }
    }
  });
});
