import * as cheerio from 'cheerio';
import { CSP } from './shell.js';

/** Elements that can run code or load other pages inside our preview. */
const REMOVE = 'script, noscript, iframe, frame, frameset, object, embed, applet, base, meta[http-equiv], template';
const URL_ATTRS = ['href', 'src', 'poster', 'data-src', 'action'];

function absolutize(value, base) {
  if (!value) return value;
  const v = value.trim();
  if (/^(#|data:|mailto:|tel:|blob:)/i.test(v)) return v;
  if (/^javascript:/i.test(v)) return '#';
  try {
    return new URL(v, base).href;
  } catch {
    return v;
  }
}

function absolutizeSrcset(value, base) {
  return value
    .split(',')
    .map((part) => {
      const [u, ...rest] = part.trim().split(/\s+/);
      return [absolutize(u, base), ...rest].join(' ');
    })
    .join(', ');
}

/**
 * Cleans a fetched web page so it can be shown safely in a sandboxed frame:
 *  - scripts, embedded frames and inline event handlers are removed
 *  - relative links, images and stylesheets become absolute so the page still looks right
 *  - links open in a new tab
 */
export function prepareWebPage(rawHtml, baseUrl) {
  const $ = cheerio.load(rawHtml);

  $(REMOVE).remove();
  // Stylesheets that are not stylesheets (preload, prefetch, ...) just add noise.
  $('link').each((_, el) => {
    const rel = ($(el).attr('rel') || '').toLowerCase();
    if (!rel.includes('stylesheet') && !rel.includes('icon')) $(el).remove();
  });

  $('*').each((_, el) => {
    for (const name of Object.keys(el.attribs || {})) {
      if (/^on/i.test(name)) $(el).removeAttr(name);
    }
  });

  if (baseUrl) {
    $('*').each((_, el) => {
      const attrs = el.attribs || {};
      for (const name of URL_ATTRS) {
        if (attrs[name]) $(el).attr(name, absolutize(attrs[name], baseUrl));
      }
      if (attrs.srcset) $(el).attr('srcset', absolutizeSrcset(attrs.srcset, baseUrl));
    });
  }

  // Lazy-loaded images: show the real image.
  $('img[data-src]').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (!src || src.startsWith('data:')) $(el).attr('src', $(el).attr('data-src'));
  });

  $('head').prepend(`<meta charset="utf-8">${CSP}<base target="_blank">`);
  return $.html();
}
