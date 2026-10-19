import { AppError } from '../errors.js';
import { postJson } from './http.js';

/**
 * A provider is { name, maxItems, maxChars, translateBatch(texts, { source, target }) }.
 * translateBatch must return an array of the same length and order as `texts`.
 * To add another engine (OpenAI, Azure, LibreTranslate, ...), add an object here and
 * register it in `providers` below.
 */

/* ---------------------------------- Mock ---------------------------------- */
// No key needed. Lets you test uploads, preview, direction and export end to end.
const mock = {
  name: 'mock',
  maxItems: 200,
  maxChars: 100000,
  async translateBatch(texts, { target }) {
    return texts.map((t) => `[${target}] ${t}`);
  },
};

/* ---------------------------------- DeepL --------------------------------- */
function deeplTarget(code) {
  const map = { en: 'EN-US', pt: 'PT-BR', 'zh-CN': 'ZH-HANS', no: 'NB' };
  return map[code] || code.split('-')[0].toUpperCase();
}
function deeplSource(code) {
  const map = { 'zh-CN': 'ZH', no: 'NB' };
  return map[code] || code.split('-')[0].toUpperCase();
}

const deepl = {
  name: 'DeepL',
  maxItems: 50,
  maxChars: 100000,
  async translateBatch(texts, { source, target }) {
    const key = process.env.DEEPL_API_KEY;
    if (!key) throw new AppError('تم اختيار DeepL لكن المتغير DEEPL_API_KEY غير مضبوط.', 500);
    const host = process.env.DEEPL_API_URL || (key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com');

    const body = { text: texts, target_lang: deeplTarget(target), preserve_formatting: true };
    if (source !== 'auto') body.source_lang = deeplSource(source);

    const data = await postJson(`${host}/v2/translate`, {
      provider: 'DeepL',
      headers: { Authorization: `DeepL-Auth-Key ${key}` },
      body,
    });
    return data.translations.map((t) => t.text);
  },
};

/* ------------------------- Google Cloud Translation ------------------------ */
const google = {
  name: 'Google Translate',
  maxItems: 100,
  maxChars: 25000,
  async translateBatch(texts, { source, target }) {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!key) throw new AppError('تم اختيار Google لكن المتغير GOOGLE_TRANSLATE_API_KEY غير مضبوط.', 500);

    const body = { q: texts, target, format: 'text' };
    if (source !== 'auto') body.source = source;

    const data = await postJson('https://translation.googleapis.com/language/translate/v2', {
      provider: 'Google',
      headers: { 'X-goog-api-key': key },
      body,
    });
    return data.data.translations.map((t) => t.translatedText);
  },
};

/* ------------------- Google Translate, free, no API key ------------------- */
// Uses the same public endpoint the Google Translate website and browser extensions use.
// It is NOT an official API: Google can rate-limit or change it, and it is meant for personal / low-volume use.
// For a public or commercial site, switch to DeepL or the official Google API (keys in .env.local).
const GOOGLE_FREE_URL = 'https://translate.googleapis.com/translate_a/single';
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Runs `fn` over `items` with at most `limit` calls in flight, keeping order. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** One request to the free endpoint. The text is sent in the POST body so length is not an issue. */
async function googleFreeRequest(text, { source, target }) {
  const query = new URLSearchParams({ client: 'gtx', sl: source, tl: target, dt: 't' });
  let status = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${GOOGLE_FREE_URL}?${query}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': BROWSER_UA },
        body: new URLSearchParams({ q: text }),
        signal: AbortSignal.timeout(20000),
      });
      status = res.status;
      if (res.ok) {
        const data = await res.json();
        // Response shape: [[ [translated, original, ...], [translated, original, ...] ], null, "detected-language"]
        return (data?.[0] || []).map((segment) => segment?.[0] ?? '').join('');
      }
      if (res.status !== 429 && res.status < 500) break; // 400/403 etc. will not get better by retrying
    } catch {
      status = 0; // network error or timeout: retry
    }
    await sleep(1500 * (attempt + 1));
  }
  throw new AppError(
    status === 429 || status === 403
      ? 'حدّت خدمة جوجل المجانية من عدد الطلبات مؤقتاً. انتظر دقيقة ثم حاول مرة أخرى، أو استخدم مفتاح DeepL.'
      : 'تعذّر الاتصال بخدمة الترجمة المجانية. تحقق من الإنترنت وحاول بعد قليل.',
    502
  );
}

const googleFree = {
  name: 'Google Translate (free)',
  maxItems: 40,
  maxChars: 4000, // keeps each request small, which the free endpoint handles reliably
  concurrency: 2, // be gentle: fewer parallel requests means fewer rate-limit blocks
  async translateBatch(texts, { source, target }) {
    // Many short strings go in one request, one per line (our strings never contain line breaks).
    const translated = await googleFreeRequest(texts.join('\n'), { source, target });
    const lines = translated.split('\n');
    if (lines.length === texts.length) {
      return lines.map((line, i) => line.trim() || texts[i]);
    }
    // Google merged or split lines: translate each string on its own so nothing is misaligned.
    return mapLimit(texts, 4, async (t) => (await googleFreeRequest(t, { source, target })).trim() || t);
  },
};

/* ------------------- LibreTranslate (free, open source) ------------------- */
// Needs a server: run your own (docker run -p 5000:5000 libretranslate/libretranslate) or point
// LIBRETRANSLATE_URL at any instance. Public instances usually require an API key.
// Arabic quality is lower than Google or DeepL.
function libreTarget(code) {
  const map = { 'zh-CN': 'zh', no: 'nb' };
  return map[code] || code;
}

const libre = {
  name: 'LibreTranslate',
  maxItems: 50,
  maxChars: 20000,
  concurrency: 2,
  async translateBatch(texts, { source, target }) {
    const base = (process.env.LIBRETRANSLATE_URL || 'http://localhost:5000').replace(/\/$/, '');
    const body = { q: texts, source: source === 'auto' ? 'auto' : libreTarget(source), target: libreTarget(target), format: 'text' };
    if (process.env.LIBRETRANSLATE_API_KEY) body.api_key = process.env.LIBRETRANSLATE_API_KEY;
    const data = await postJson(`${base}/translate`, { provider: 'LibreTranslate', body });
    return Array.isArray(data.translatedText) ? data.translatedText : [data.translatedText];
  },
};

const providers = {
  'google-free': googleFree,
  libretranslate: libre,
  deepl,
  google,
  mock,
};

/**
 * Which engine is used:
 *  1. TRANSLATION_PROVIDER if you set it (google-free | libretranslate | deepl | google | mock)
 *  2. otherwise DeepL when DEEPL_API_KEY exists
 *  3. otherwise the free Google engine, so the app works with no setup at all
 */
export function getProviderId() {
  const explicit = (process.env.TRANSLATION_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'free') return 'google-free';
  if (explicit) return explicit;
  return process.env.DEEPL_API_KEY ? 'deepl' : 'google-free';
}

export function getProvider() {
  const id = getProviderId();
  const provider = providers[id];
  if (!provider) {
    throw new AppError(
      `قيمة TRANSLATION_PROVIDER غير معروفة "${id}". استخدم google-free أو libretranslate أو deepl أو google أو mock.`,
      500
    );
  }
  return provider;
}
