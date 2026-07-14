// Shared HTML → plain-text conversion for job descriptions across all
// providers. Decodes entities BEFORE stripping tags — some feeds (Greenhouse's
// `content` field, notably) return their HTML *double-encoded*, i.e. the tags
// themselves are entity-escaped (`&lt;h2&gt;` instead of `<h2>`). Stripping
// tags first and decoding entities last (the previous, buggy order) means
// those escaped tags only become literal "<h2>"-looking text *after* the
// last tag-stripping pass ever runs, so they leak straight into what users
// see. Decoding first (twice, if a second layer of escaping is detected)
// means every real tag is a real `<...>` by the time we strip.

function decodeEntitiesOnce(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

export function stripHtml(html = '') {
  let text = decodeEntitiesOnce(html || '');
  // A second decode pass catches double-encoded content (e.g. Greenhouse),
  // where the first pass only reveals another layer of escaped tags.
  if (/&lt;\/?[a-z]/i.test(text) || /&amp;(lt|gt|amp|quot|#39);/i.test(text)) {
    text = decodeEntitiesOnce(text);
  }

  return text
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#?\w+;/g, ' ') // any remaining/unknown named or numeric entity
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
