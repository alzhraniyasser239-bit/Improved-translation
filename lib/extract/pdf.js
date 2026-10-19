import pdfParse from 'pdf-parse/lib/pdf-parse.js'; // the package root runs a debug routine; import the lib directly
import { AppError } from '../errors.js';
import { documentShell, textToParagraphs } from '../html/shell.js';

/**
 * PDFs store lines, not paragraphs. This joins lines that belong together so the
 * translator sees whole sentences (much better translations than line fragments).
 */
function rebuildParagraphs(raw) {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const paragraphs = [];
  let current = '';
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (current) paragraphs.push(current);
      current = '';
      continue;
    }
    if (!current) {
      current = t;
    } else if (current.endsWith('-') && /^\p{Ll}/u.test(t)) {
      current = current.slice(0, -1) + t; // re-join hyphenated words
    } else {
      current += ' ' + t;
    }
    // A line that ends a sentence and is short is likely the end of a paragraph.
    if (/[.!?؟。:]$/.test(t) && t.length < 60) {
      paragraphs.push(current);
      current = '';
    }
  }
  if (current) paragraphs.push(current);
  return paragraphs.join('\n\n');
}

export async function extractFromPdf(buffer, title, lang) {
  let data;
  try {
    data = await pdfParse(buffer);
  } catch {
    throw new AppError('تعذّرت قراءة ملف PDF. قد يكون تالفاً أو محمياً بكلمة مرور.', 422);
  }
  const text = rebuildParagraphs(data.text || '');
  if (text.replace(/\s/g, '').length < 20) {
    throw new AppError(
      'لا يوجد نص في هذا الملف. يبدو أنه مصوّر ضوئياً: حوّل الصفحات إلى صور وارفعها بدلاً منه.',
      422
    );
  }
  return { title, html: documentShell({ title, bodyHtml: textToParagraphs(text), lang }) };
}
