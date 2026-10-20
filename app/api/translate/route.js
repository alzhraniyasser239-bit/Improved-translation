import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { extractFromFile, extractFromUrl } from '@/lib/extract';
import { translateHtml } from '@/lib/html/translate-html';
import { isSupported } from '@/lib/languages';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds max for Vercel

export async function POST(request) {
  try {
    const form = await request.formData();
    const mode = form.get('mode');
    const source = String(form.get('source') || 'auto');
    const target = String(form.get('target') || 'ar');

    if (!isSupported(source) || !isSupported(target) || target === 'auto') {
      throw new AppError('اختر لغة مصدر ولغة هدف صحيحتين للترجمة.');
    }

    let extracted;
    if (mode === 'url') {
      const url = String(form.get('url') || '').trim();
      if (!url) throw new AppError('يرجى إدخال عنوان الصفحة المراد ترجمتها.');
      extracted = await extractFromUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    } else if (mode === 'file') {
      const file = form.get('file');
      if (!file || typeof file === 'string') throw new AppError('يرجى اختيار ملف صحيح للترجمة.');
      extracted = await extractFromFile(file, { source });
    } else {
      throw new AppError('نوع الإدخال غير معروف.');
    }

    // تطبيق محرك الترجمة المرآسية المتقدم الذي أنشأته
    const { html: translatedHtml, stats } = await translateHtml(extracted.html, {
      targetLang: target,
      sourceLang: source === 'auto' ? undefined : source,
      deadlineMs: 50000 // الأمان ضمن حدود Vercel
    });

    console.log('[Translation Stats]:', stats);

    return NextResponse.json({
      title: extracted.title,
      originalHtml: extracted.originalHtml || extracted.html,
      translatedHtml: translatedHtml || extracted.html,
      characters: stats ? stats.textNodes * 10 : 100,
      provider: 'google-v2'
    });

r  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[translate route error]:', err);
    return NextResponse.json({ 
      error: err.message || 'حدث خطأ غير متوقع أثناء معالجة الترجمة.' 
    }, { status: 400 });
  }
}