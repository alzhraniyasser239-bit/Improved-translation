import * as cheerio from 'cheerio';
import { AppError } from '../errors.js';
import { isRtl } from '../languages.js';
import { translateTexts } from '../translation/index.js';

/** Text inside these elements is never translated (code, data, graphics). */
const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'code', 'pre', 'kbd', 'samp', 'textarea', 'svg', 'math']);
/** Attributes whose values are shown to the reader. */
const TEXT_ATTRS = ['alt', 'title', 'placeholder', 'aria-label'];

const hasLetters = (s) => /\p{L}/u.test(s);

/** Walks the document and returns every text node worth translating, in reading order. */
function collectTextNodes($) {
  const nodes = [];
  const walk = (node) => {
    if (node.type === 'text') {
      if (hasLetters(node.data)) nodes.push(node);
      return;
    }
    if (node.type !== 'tag' || SKIP_TAGS.has(node.name)) return;
    for (const child of node.children || []) walk(child);
  };
  for (const child of $.root().get(0).children) walk(child);
  return nodes;
}

function collectAttributes($) {
  const items = [];
  for (const attr of TEXT_ATTRS) {
    $(`[${attr}]`).each((_, el) => {
      const value = (el.attribs[attr] || '').trim();
      if (hasLetters(value)) items.push({ el, attr, value });
    });
  }
  return items;
}

/** Keeps the original spacing around a text node so inline layout does not collapse. */
function splitWhitespace(data) {
  const lead = /^\s*/.exec(data)[0];
  const trail = /\s*$/.exec(data)[0];
  const core = data.trim().replace(/\s+/g, ' ');
  return { lead: lead ? ' ' : '', trail: trail ? ' ' : '', core };
}

function applyDirection($, target) {
  const rtl = isRtl(target);
  $('html').attr('lang', target).attr('dir', rtl ? 'rtl' : 'ltr');
  $('body').attr('dir', rtl ? 'rtl' : 'ltr');
  if (rtl) {
    // Keep the page's own CSS but make sure text starts on the right.
    $('head').append('<style id="translator-dir">body{direction:rtl;text-align:right}</style>');
  }
}

/**
 * Translates a whole HTML document while keeping every tag, style and image as it was.
 * Only text nodes and a few readable attributes (alt, title, placeholder) change.
 */
export async function translateHtml(html, { source, target }) {
  const $ = cheerio.load(html);
  const textNodes = collectTextNodes($);
  const attrItems = collectAttributes($);

  const pieces = textNodes.map((n) => splitWhitespace(n.data));
  const strings = [...pieces.map((p) => p.core), ...attrItems.map((a) => a.value.replace(/\s+/g, ' '))];

  if (strings.length === 0) throw new AppError('لم يتم العثور على نص قابل للترجمة في هذا المحتوى.', 422);

  const maxChars = Number(process.env.MAX_TRANSLATE_CHARS) || 150000;
  const total = strings.reduce((n, s) => n + s.length, 0);
  if (total > maxChars) {
    throw new AppError(
      `يحتوي هذا المحتوى على ${total.toLocaleString('en-US')} حرفاً، وهو أكثر من الحد المسموح (${maxChars.toLocaleString('en-US')}). جرّب مستنداً أقصر.`,
      413
    );
  }

  const translated = await translateTexts(strings, { source, target });

  textNodes.forEach((node, i) => {
    node.data = pieces[i].lead + translated[i] + pieces[i].trail;
  });
  attrItems.forEach((item, i) => {
    $(item.el).attr(item.attr, translated[textNodes.length + i]);
  });

  applyDirection($, target);
  return { html: $.html(), characters: total };
}
