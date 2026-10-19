import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { extractFromFile, extractFromUrl } from '@/lib/extract';
import { translateHtml } from '@/lib/html/translate-html';
import { isSupported } from '@/lib/languages';
import { getProviderId } from '@/lib/translation/providers';

export const runtime = 'nodejs';
export const maxDuration = 60; // seconds (raise on hosts that allow it for very large documents)

/**
 * POST multipart/form-data
 *   mode:   "url" | "file"
 *   url:    web address (mode=url)
 *   file:   uploaded file (mode=file)
 *   source: language code or "auto"
 *   target: language code
 *
 * Response: { title, originalHtml, translatedHtml, characters, provider }
 */
export async function POST(request) {
  try {
    const form = await request.formData();
    const mode = form.get('mode');
    const source = String(form.get('source') || 'auto');
    const target = String(form.get('target') || '');

    if (!isSupported(source) || !isSupported(target) || target === 'auto') {
      throw new AppError('اختر لغة مصدر ولغة هدف صحيحتين.');
    }
    if (source === target) throw new AppError('لغة المصدر ولغة الهدف متطابقتان.');

    let extracted;
    if (mode === 'url') {
      const url = String(form.get('url') || '').trim();
      if (!url) throw new AppError('أدخل عنوان الصفحة المراد ترجمتها.');
      extracted = await extractFromUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    } else if (mode === 'file') {
      const file = form.get('file');
      if (!file || typeof file === 'string') throw new AppError('اختر ملفاً للترجمة.');
      const maxMb = Number(process.env.MAX_UPLOAD_MB) || 15;
      if (file.size > maxMb * 1024 * 1024) throw new AppError(`حجم الملف أكبر من ${maxMb} ميغابايت.`, 413);
      extracted = await extractFromFile(file, { source });
    } else {
      throw new AppError('نوع الإدخال غير معروف.');
    }

    const { html: translatedHtml, characters } = await translateHtml(extracted.html, { source, target });

    return NextResponse.json({
      title: extracted.title,
      originalHtml: extracted.originalHtml || extracted.html,
      translatedHtml,
      characters,
      provider: getProviderId(),
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[translate] unexpected error', err);
    return NextResponse.json({ error: 'حدث خطأ أثناء الترجمة. حاول مرة أخرى.' }, { status: 500 });
  }
}
