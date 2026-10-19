import * as cheerio from 'cheerio';

const SKIP = new Set(['script', 'style', 'noscript', 'head', 'svg', 'template']);
const BLOCKS = new Set([
  'p', 'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'blockquote',
  'pre', 'table', 'figure', 'figcaption', 'form', 'fieldset', 'dl', 'dt', 'dd',
]);

function render(node, pre = false) {
  if (node.type === 'text') return pre ? node.data : node.data.replace(/\s+/g, ' ');
  if (node.type !== 'tag' || SKIP.has(node.name)) return '';

  const name = node.name;
  const children = (inPre = pre) => (node.children || []).map((c) => render(c, inPre)).join('');

  if (name === 'br') return '\n';
  if (name === 'hr') return '\n\n----------\n\n';
  if (/^h[1-6]$/.test(name)) return `\n\n${children().trim()}\n\n`;
  if (name === 'tr') return `\n${children().trim()}`;
  if (name === 'td' || name === 'th') return `${children().trim()}\t`;
  if (name === 'ul' || name === 'ol') {
    let n = 0;
    const items = (node.children || []).map((c) => {
      if (c.type === 'tag' && c.name === 'li') {
        const marker = name === 'ol' ? `${++n}. ` : '• ';
        const body = (c.children || []).map((x) => render(x, pre)).join('').trim();
        return `\n${marker}${body}`;
      }
      return render(c, pre);
    });
    return `\n\n${items.join('')}\n\n`;
  }
  if (BLOCKS.has(name)) return `\n\n${children(name === 'pre' ? true : pre)}\n\n`;
  return children();
}

/** HTML → readable plain text with paragraphs, headings and list markers. */
export function htmlToText(html) {
  const $ = cheerio.load(html);
  const body = $('body').get(0);
  const raw = (body?.children || []).map((c) => render(c)).join('');
  const text = raw
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // The byte-order mark makes Windows Notepad open Arabic, Russian etc. correctly.
  return `\uFEFF${text}\n`;
}
