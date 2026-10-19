import mammoth from 'mammoth';
import { AppError } from '../errors.js';
import { documentShell } from '../html/shell.js';

/** Word → HTML keeps headings, lists, bold/italic, tables and embedded images. */
export async function extractFromDocx(buffer, title, lang) {
  let result;
  try {
    result = await mammoth.convertToHtml({ buffer });
  } catch {
    throw new AppError('تعذّرت قراءة ملف Word. احفظه بصيغة docx وحاول مرة أخرى.', 422);
  }
  return { title, html: documentShell({ title, bodyHtml: result.value, lang }) };
}
