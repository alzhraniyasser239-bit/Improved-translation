import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { extractFromFile, extractFromUrl } from '@/lib/extract';
import { translateHtml } from '@/lib/html/translate-html';
import { isSupported } from '@/lib/languages';
import { getProviderId } from '@/lib/translation/providers';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  try {
    const form = await request.formData();
    const mode = form.get('mode');
    const source = String(form.get('source') || 'auto');
    const target = String(form.get('target') || 'ar');

    if (!isSupported(source) || !isSupported(target) || target === 'auto') {
      throw new AppError('اختر لغة مصدر ولغة هدف صحيحتين.');
    }

    let extracted;
    if (mode === 'url') {
      const url = String(form.get('url') || '').trim();
      if (!url) throw new AppError('أدخل عنوان الصفحة المراد ترجمتها.');
      extracted = await extractFromUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    } else if (mode === 'file') {
      const file = form.get('file');
      if (!file || typeof file === 'string') throw new AppError('اختر ملفاً للترجمة.');
      extracted = await extractFromFile(file, { source });
    } else {
      throw new AppError('نوع الإدخال غير معروف.');
    }

    // إذا كان الناتج يحتوي على بطاقة تنبيه بسبب حظر أو خطأ حقيقي، يُرجع مباشرة دون معالجة إضافية
    if (extracted.html && (extracted.html.includes('سبب عدم إكمال الترجمة') || extracted.html.includes('سبب عدم ظهور المحتوى') || extracted.html.includes('سبب الفشل'))) {
      return NextResponse.json({
        title: extracted.title,
        originalHtml: extracted.html,
        translatedHtml: extracted.html,
        characters: extracted.content ? extracted.content.length : 0,
        provider: 'system'
      });
    }

    const { html: translatedHtml, characters } = await translateHtml(extracted.html, { source, target });

    return NextResponse.json({
      title: extracted.title,
      originalHtml: extracted.originalHtml || extracted.html,
      translatedHtml: translatedHtml || extracted.html,
      characters: characters || 100,
      provider: getProviderId ? getProviderId() : 'google',
    });

  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[translate] error:', err);
    return NextResponse.json({ 
      error: err.message || 'حدث خطأ غير متوقع أثناء معالجة الطلب.' 
    }, { status: 400 });
  }
}