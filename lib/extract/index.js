import { extractText } from './text.js';
import { extractPdf } from './pdf.js';
import { extractDocx } from './docx.js';
import { extractImage } from './image.js';
import { extractUrlContent } from './url.js';

export async function extractFromFile(file, options = {}) {
  const fileName = (file.name || '').toLowerCase();
  
  if (fileName.endsWith('.pdf')) {
    if (typeof extractPdf !== 'function') {
      throw new Error('دالة استخراج ملفات PDF غير متوفرة.');
    }
    return await extractPdf(file, options);
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return await extractDocx(file, options);
  } else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
    return await extractImage(file, options);
  } else {
    return await extractText(file, options);
  }
}

export { extractUrlContent as extractFromUrl };