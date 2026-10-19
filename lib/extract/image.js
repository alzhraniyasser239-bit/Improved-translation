import os from 'node:os';
import { createWorker } from 'tesseract.js';
import { AppError } from '../errors.js';
import { documentShell, escapeHtml, textToParagraphs } from '../html/shell.js';
import { getLanguage } from '../languages.js';

/** Uses the chosen source language for OCR, or a broad set when it is "auto". */
function ocrLanguages(source) {
  if (source !== 'auto') return getLanguage(source)?.ocr || 'eng';
  return 'eng+ara+fra+spa+ita+rus+deu';
}

/**
 * Reads text from a screenshot or photo (OCR). Language data is downloaded by
 * Tesseract on first use and cached in the temp folder.
 * Quality depends on the image: sharp, high-contrast screenshots work best.
 */
export async function extractFromImage(buffer, mime, title, source) {
  let text;
  const worker = await createWorker(ocrLanguages(source), 1, { cachePath: os.tmpdir() });
  try {
    const { data } = await worker.recognize(buffer);
    text = data.text || '';
  } catch {
    throw new AppError('تعذّرت قراءة النص من هذه الصورة.', 422);
  } finally {
    await worker.terminate();
  }

  if (text.replace(/\s/g, '').length < 3) {
    throw new AppError('لم يتم العثور على نص مقروء في هذه الصورة.', 422);
  }

  const bodyText = textToParagraphs(text);
  const lang = source === 'auto' ? 'en' : source;
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;

  return {
    title,
    // What gets translated: just the recognised text.
    html: documentShell({ title, bodyHtml: bodyText, lang }),
    // What the "Original" pane shows: the image itself, then the recognised text.
    originalHtml: documentShell({
      title,
      lang,
      bodyHtml: `<img src="${dataUri}" alt="${escapeHtml(title)}" style="border:1px solid #cfd8dc;border-radius:6px;margin-bottom:24px">${bodyText}`,
    }),
  };
}