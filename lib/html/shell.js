import { isRtl } from '../languages.js';

const CSP = `<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'">`;

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Wraps body markup in a clean, readable HTML page. Used for every source that is
 * not already a web page (PDF, DOCX, TXT, images).
 */
export function documentShell({ title, bodyHtml, lang = 'en' }) {
  const dir = isRtl(lang) ? 'rtl' : 'ltr';
  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${CSP}
<base target="_blank">
<title>${escapeHtml(title || 'Document')}</title>
<style>
  body { font-family: "Segoe UI", "Noto Sans Arabic", "Noto Sans", Tahoma, Arial, sans-serif; line-height: 1.75;
         color: #1b2631; background: #fff; max-width: 780px; margin: 0 auto; padding: 40px 32px; font-size: 16px; }
  h1, h2, h3, h4 { line-height: 1.3; margin: 1.6em 0 .5em; }
  p { margin: 0 0 1em; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  td, th { border: 1px solid #cfd8dc; padding: 6px 10px; vertical-align: top; }
  blockquote { margin: 1em 0; padding-inline-start: 1em; border-inline-start: 3px solid #cfd8dc; color: #455a64; }
  pre { white-space: pre-wrap; background: #f4f6f8; padding: 12px; border-radius: 6px; }
  html[dir="rtl"] body { text-align: right; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/** Plain text → paragraphs of HTML. Single line breaks inside a paragraph are kept. */
export function textToParagraphs(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

export { CSP };
