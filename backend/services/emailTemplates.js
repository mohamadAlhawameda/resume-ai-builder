// Shared HTML email layout — plain table-based markup (not flex/grid) so it
// renders consistently across email clients, including Outlook desktop's
// Word rendering engine, which ignores most modern CSS. Every dynamic string
// is HTML-escaped before interpolation since job titles/companies come from
// external job-board APIs and must never be trusted as raw HTML.

const BRAND_BLUE = '#2563eb';
const BRAND_GRADIENT = 'linear-gradient(135deg, #2563eb, #4f46e5)';
const TEXT_DARK = '#0f172a';
const TEXT_MUTED = '#64748b';
const BORDER = '#e2e8f0';

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wrap body HTML in the shared branded layout (logo header, card, footer). */
export function emailLayout({ preheader = '', title = 'Rolevant AI', bodyHtml, footerNote = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; border:1px solid ${BORDER};">
          <tr>
            <td style="background-color:${BRAND_BLUE}; background-image:${BRAND_GRADIENT}; padding:24px 32px; border-radius:16px 16px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px; height:36px; background-color:#ffffff; border-radius:10px; text-align:center; vertical-align:middle; font-size:18px; font-weight:700; color:${BRAND_BLUE}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">R</td>
                  <td style="padding-left:10px; font-size:18px; font-weight:700; color:#ffffff;">Rolevant AI</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px; color:${TEXT_DARK};">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 24px; background-color:#f8fafc; border-top:1px solid ${BORDER}; border-radius:0 0 16px 16px;">
              ${footerNote ? `<p style="margin:0 0 8px; font-size:12px; line-height:1.6; color:${TEXT_MUTED};">${footerNote}</p>` : ''}
              <p style="margin:0; font-size:12px; color:${TEXT_MUTED};">© ${new Date().getFullYear()} Rolevant AI. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Solid, branded call-to-action button (table-wrapped for email-client support). */
export function ctaButton(text, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="border-radius:10px; background-color:${BRAND_BLUE}; background-image:${BRAND_GRADIENT};">
        <a href="${escapeHtml(url)}" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">${escapeHtml(text)}</a>
      </td>
    </tr>
  </table>`;
}

/** Small "label: value" summary card, e.g. company / location / match %. */
export function infoCard(rows) {
  const rowsHtml = rows
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:7px 16px; font-size:13px; color:${TEXT_MUTED}; border-bottom:1px solid ${BORDER};">${escapeHtml(label)}</td>
      <td style="padding:7px 16px; font-size:13px; color:${TEXT_DARK}; font-weight:600; text-align:right; border-bottom:1px solid ${BORDER};">${escapeHtml(value)}</td>
    </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; border:1px solid ${BORDER}; border-radius:12px; margin:16px 0; overflow:hidden;">
    ${rowsHtml}
  </table>`;
}

/** Bulleted list of plain strings or {text, url} link items. */
export function bulletList(items) {
  const li = items
    .map((item) => {
      const content =
        typeof item === 'string'
          ? escapeHtml(item)
          : `<a href="${escapeHtml(item.url)}" style="color:${BRAND_BLUE}; text-decoration:none; font-weight:600;">${escapeHtml(item.text)}</a>${item.suffix ? escapeHtml(item.suffix) : ''}`;
      return `<li style="margin-bottom:8px; font-size:14px; line-height:1.6; color:${TEXT_DARK};">${content}</li>`;
    })
    .join('');
  return `<ul style="margin:12px 0; padding-left:20px;">${li}</ul>`;
}

export function paragraph(text) {
  return `<p style="margin:0 0 14px; font-size:14px; line-height:1.7; color:${TEXT_DARK};">${text}</p>`;
}

export function heading(text) {
  return `<h1 style="margin:0 0 16px; font-size:22px; line-height:1.3; font-weight:700; color:${TEXT_DARK};">${escapeHtml(text)}</h1>`;
}

export { TEXT_DARK, TEXT_MUTED, BRAND_BLUE };
