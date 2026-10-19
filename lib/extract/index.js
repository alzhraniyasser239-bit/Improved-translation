import { extractPdfContent } from './pdf';
import { extractDocxContent } from './docx';
import { extractImageContent } from './image';
import { extractTextContent } from './text';
import { extractUrlContent } from './url';

export async function extractFromFile(file, options = {}) {
  const fileName = file.name || '';
  const ext = fileName.split('.').pop().toLowerCase();

  try {
    if (ext === 'pdf') {
      return await extractPdfContent(file, options);
    } else if (['doc', 'docx'].includes(ext)) {
      return await extractDocxContent(file, options);
    } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext)) {
      return await extractImageContent(file, options);
    } else if (['txt', 'csv', 'md', 'json', 'html', 'xml', 'js', 'css'].includes(ext)) {
      return await extractTextContent(file, options);
    }

    // fallback لجميع أنواع الملفات الأخرى الشاذة وغير المعروفة
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const textContent = decoder.decode(buffer);

    return {
      title: fileName || 'ملف مرفوع',
      content: textContent || 'محتوى ملف غير نصي',
      html: `<pre style="white-space: pre-wrap; word-break: break-word;">${textContent || 'محتوى الملف'}</pre>`
    };
  } catch (err) {
    console.error('Extract file fallback error:', err);
    return {
      title: fileName || 'مستند',
      content: 'محتوى غير قابل للقراءة المباشرة',
      html: `<p>محتوى غير قابل للقراءة المباشرة</p>`
    };
  }
}

export async function extractFromUrl(url) {
  return await extractUrlContent(url);
}