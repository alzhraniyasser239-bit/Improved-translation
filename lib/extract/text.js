import { documentShell, textToParagraphs } from '../html/shell.js';

export function extractFromText(buffer, title, lang) {
  // Strip a UTF-8 byte-order mark if present.
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  return { title, html: documentShell({ title, bodyHtml: textToParagraphs(text), lang }) };
}
