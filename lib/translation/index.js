import { getProvider } from './providers.js';

/** Splits strings into batches that respect the provider's request limits. */
function toBatches(items, { maxItems, maxChars }) {
  const batches = [];
  let current = [];
  let chars = 0;
  for (const item of items) {
    if (current.length && (current.length >= maxItems || chars + item.length > maxChars)) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += item.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

/**
 * Translates a list of strings, keeping order. Identical strings are sent once
 * (menus and buttons repeat a lot), which cuts API cost on web pages.
 */
export async function translateTexts(texts, { source = 'auto', target }) {
  const provider = getProvider();
  const unique = [...new Set(texts)];
  const results = new Map();

  // A few batches at a time keeps big documents fast without hitting rate limits.
  const batches = toBatches(unique, provider);
  const CONCURRENCY = provider.concurrency || 3;
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    await Promise.all(
      batches.slice(i, i + CONCURRENCY).map(async (batch) => {
        const out = await provider.translateBatch(batch, { source, target });
        batch.forEach((text, idx) => results.set(text, out[idx] ?? text));
      })
    );
  }
  return texts.map((t) => results.get(t));
}
