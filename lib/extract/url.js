import * as cheerio from 'cheerio';
import { fetchHtml } from '../net/safe-fetch.js';
import { prepareWebPage } from '../html/prepare.js';

/** Fetches a web page and returns clean, absolute-URL HTML ready to translate. */
export async function extractFromUrl(url) {
  const { html, finalUrl } = await fetchHtml(url);
  const prepared = prepareWebPage(html, finalUrl);
  const title = cheerio.load(prepared)('title').first().text().trim() || new URL(finalUrl).hostname;
  return { title, html: prepared };
}
