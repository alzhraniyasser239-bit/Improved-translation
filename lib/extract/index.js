import { AppError } from '../errors.js';
import { prepareWebPage } from '../html/prepare.js';
import { extractFromDocx } from './docx.js';
import { extractFromImage } from './image.js';
import { extractFromPdf } from './pdf.js';
import { extractFromText } from './text.js';
import { extractFromUrl } from './url.js';

export { extractFromUrl };

const IMAGE_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  bmp: 'image/bmp',
  gif: 'image/gif',
};

export const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'csv', 'html', 'htm', ...Object.keys(IMAGE_TYPES)];

/** Picks the right reader for an uploaded file. Returns { title, html, originalHtml? }. */
export async function extractFromFile(file, { source }) {
  const name = file.name || 'document';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const title = name.replace(/\.[^.]+$/, '');
  const buffer = Buffer.from(await file.arrayBuffer());
  const lang = source === 'auto' ? 'en' : source;

  if (ext === 'pdf') return extractFromPdf(buffer, title, lang);
  if (ext === 'docx') return extractFromDocx(buffer, title, lang);
  if (['txt', 'md', 'csv'].includes(ext)) return extractFromText(buffer, title, lang);
  if (['html', 'htm'].includes(ext)) return { title, html: prepareWebPage(buffer.toString('utf8'), null) };
  if (IMAGE_TYPES[ext]) return extractFromImage(buffer, IMAGE_TYPES[ext], title, source);
  if (ext === 'doc') {
    throw new AppError('ملفات doc القديمة غير مدعومة. افتحه في Word واحفظه بصيغة docx.');
  }
  throw new AppError(`الملفات من نوع ".${ext || 'غير معروف'}" غير مدعومة. استخدم PDF أو DOCX أو TXT أو HTML أو صورة.`);
}
