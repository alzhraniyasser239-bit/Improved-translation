import * as cheerio from 'cheerio';

const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv']);

const SKIP_TAGS = new Set([
  'script', 'style', 'noscript', 'template', 'textarea',
  'code', 'pre', 'kbd', 'samp', 'svg-defs',
]);

const TEXT_ATTRS = ['title', 'alt', 'placeholder', 'aria-label', 'aria-description'];

const META_SELECTORS = [
  ['name', 'description'],
  ['name', 'twitter:title'],
  ['name', 'twitter:description'],
  ['property', 'og:title'],
  ['property', 'og:description'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HAS_LETTER = /\p{L}/u;
const ARABIC_CHAR = /[\u0600-\u06FF]/g;
const ANY_LETTER = /\p{L}/gu;

function isTranslatable(text, targetLang) {
  if (!text || !HAS_LETTER.test(text)) return false;
  if (targetLang === 'ar') {
    const letters = text.match(ANY_LETTER)?.length || 0;
    const arabic = text.match(ARABIC_CHAR)?.length || 0;
    if (letters > 0 && arabic / letters > 0.6) return false;
  }
  return true;
}

function splitWhitespace(raw) {
  const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
  return { lead: m[1], core: m[2], trail: m[3] };
}

const normalize = (s) => s.replace(/\s+/g, ' ');

function shouldSkipElement(node) {
  const name = (node.name || '').toLowerCase();
  if (SKIP_TAGS.has(name)) return true;
  const attrs = node.attribs || {};
  if (attrs.translate === 'no') return true;
  if (attrs.class && /(^|\s)notranslate(\s|$)/.test(attrs.class)) return true;
  return false;
}

/**
 * طبقة التصحيح الذكي والترشيح (Post-Processing) لإزالة أخطاء الترجمة الآلية الشائعة
 */
function cleanArabicTranslation(text) {
  if (!text) return text;
  return text
    // تصحيح أخطاء الوقت والوحدات المتكررة في الترجمة الآلية
    .replace(/(\d+)\s*عامًا\s*دقائق/g, '$1 دقيقة')
    .replace(/(\d+)\s*سنة\s*دقائق/g, '$1 دقيقة')
    .replace(/30\s*عامًا\s*دقائق/g, '30 دقيقة')
    .replace(/دقيقة\s*عامًا/g, 'دقيقة')
    // تنظيف الأقواس غير المتوازنة أو الزائدة
    .replace(/\(\s*\)/g, '')
    .trim();
}

function collectTargets($, targetLang) {
  const targets = [];
  const root = $.root()[0];
  const stack = [root];

  while (stack.length) {
    const node = stack.pop();

    if (node.type === 'text') {
      const { lead, core, trail } = splitWhitespace(node.data || '');
      const text = normalize(core);
      if (isTranslatable(text, targetLang)) {
        targets.push({
          text,
          apply: (translated) => {
            const cleaned = targetLang === 'ar' ? cleanArabicTranslation(translated) : translated;
            node.data = lead + cleaned + trail;
          },
        });
      }
      continue;
    }

    if (node.type === 'tag' || node.type === 'root' || node.type === 'script' || node.type === 'style') {
      if (node.type !== 'root' && shouldSkipElement(node)) continue;

      if (node.type === 'tag') {
        const el = $(node);
        const name = (node.name || '').toLowerCase();

        for (const attr of TEXT_ATTRS) {
          const val = el.attr(attr);
          if (val) {
            const text = normalize(val.trim());
            if (isTranslatable(text, targetLang)) {
              targets.push({ 
                text, 
                apply: (t) => el.attr(attr, targetLang === 'ar' ? cleanArabicTranslation(t) : t) 
              });
            }
          }
        }
      }

      const children = node.children || [];
      for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
    }
  }

  return targets;
}

async function freeGoogleTranslate(texts, { targetLang, sourceLang }) {
  return await Promise.all(
    texts.map(async (text) => {
      try {
        const sl = sourceLang || 'auto';
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
        );
        if (!res.ok) return text;
        const data = await res.json();
        if (data && data[0]) {
          return data[0].map((item) => item[0]).join('');
        }
        return text;
      } catch (e) {
        return text;
      }
    })
  );
}

function makeBatches(uniqueTexts, maxItems = 25) {
  const batches = [];
  for (let i = 0; i < uniqueTexts.length; i += maxItems) {
    batches.push(uniqueTexts.slice(i, i + maxItems));
  }
  return batches;
}

export async function translateHtml(html, options = {}) {
  const targetLang = options.targetLang || 'ar';
  const sourceLang = options.sourceLang;
  const startedAt = Date.now();

  const $ = cheerio.load(html);

  const targets = collectTargets($, targetLang);
  const unique = [...new Set(targets.map((t) => t.text))];
  const cache = new Map();

  const stats = {
    textNodes: targets.length,
    uniqueStrings: unique.length,
    translatedStrings: 0,
    failedBatches: 0,
    durationMs: 0,
  };

  const batches = makeBatches(unique, 25);

  for (const batch of batches) {
    try {
      const translated = await freeGoogleTranslate(batch, { targetLang, sourceLang });
      batch.exports = true;
      batch.forEach((src, k) => cache.set(src, translated[k]));
      stats.translatedStrings += batch.length;
      await sleep(80);
    } catch (err) {
      stats.failedBatches++;
    }
  }

  for (const t of targets) {
    const translated = cache.get(t.text);
    if (translated) t.apply(translated);
  }

  const lang = targetLang.toLowerCase();
  const htmlEl = $('html');
  if (htmlEl.length) {
    htmlEl.attr('lang', targetLang);
    if (RTL_LANGS.has(lang.split('-')[0])) {
      htmlEl.attr('dir', 'rtl');
      $('body').attr('dir', 'rtl');
    } else {
      htmlEl.attr('dir', 'ltr');
    }
  }

  stats.durationMs = Date.now() - startedAt;
  return { html: $.html(), stats };
}

export default translateHtml;