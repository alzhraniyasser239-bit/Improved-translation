import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { extractFromFile, extractFromUrl } from '@/lib/extract';
import { translateHtml } from '@/lib/html/translate-html';
import { translateText } from '@/lib/translation/providers';
import { isSupported } from '@/lib/languages';
import { getProviderId } from '@/lib/translation/providers';

// مكتبات معالجة الملفات المختلفة
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

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
    if (source === target) throw new AppError('لغة المصدر ولغة الهدف متطابقتان.');

    let extracted;

    // --- 1. معالجة الروابط (URL) ---
    if (mode === 'url') {
      const url = String(form.get('url') || '').trim();
      if (!url) throw new AppError('أدخل عنوان الصفحة المراد ترجمتها.');
      extracted = await extractFromUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`);

    // --- 2. معالجة الملفات (Files) بكل أنواعها ---
    } else if (mode === 'file') {
      const file = form.get('file');
      if (!file || typeof file === 'string') throw new AppError('اختر ملفاً للترجمة.');
      const maxMb = Number(process.env.MAX_UPLOAD_MB) || 15;
      if (file.size > maxMb * 1024 * 1024) throw new AppError(`حجم الملف أكبر من ${maxMb} ميغابايت.`, 413);

      const fileName = file.name || '';
      const ext = fileName.split('.').pop()?.toLowerCase();
      const buffer = Buffer.from(await file.arrayBuffer());

      let extractedText = '';
      let extractedHtml = '';

      // أ) ملفات الـ PDF
      if (ext === 'pdf' || file.type === 'application/pdf') {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text?.trim() || '';
        if (!extractedText) throw new AppError('لم نتمكن من قراءة أي نصوص داخل ملف الـ PDF (قد يكون صور فقط).');
        
        extractedHtml = extractedText
          .split('\n')
          .filter(l => l.trim())
          .map(l => `<p>${l.trim()}</p>`)
          .join('');

      // ب) ملفات Word (.docx)
      } else if (ext === 'docx') {
        const result = await mammoth.convertToHtml({ buffer });
        extractedHtml = result.value;
        extractedText = result.value.replace(/<[^>]+>/g, ' ');

      // ج) ملفات Excel (.xlsx, .xls, .csv)
      } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let fullCsv = '';
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          fullCsv += XLSX.utils.sheet_to_csv(sheet) + '\n\n';
        });
        extractedText = fullCsv.trim();
        extractedHtml = `<pre>${extractedText}</pre>`;

      // د) ملفات النصوص العادية (.txt, .md, .json)
      } else if (['txt', 'md', 'json', 'srt'].includes(ext) || file.type.startsWith('text/')) {
        extractedText = buffer.toString('utf-8');
        extractedHtml = `<pre style="white-space: pre-wrap;">${extractedText}</pre>`;

      // هـ) باقي الملفات: الاعتماد على المحول الافتراضي عندك
      } else {
        try {
          extracted = await extractFromFile(file, { source });
        } catch (e) {
          throw new AppError('صيغة الملف غير مدعومة حالياً.');
        }
      }

      // إذا تم استخراج محتوى بواسطة معالجنا للملفات الشائعة
      if (extractedText || extractedHtml) {
        extracted = {
          title: fileName,
          content: extractedText,
          html: extractedHtml || `<p>${extractedText}</p>`,
          originalHtml: extractedHtml || `<p>${extractedText}</p>`
        };
      }

    } else {
      throw new AppError('نوع الإدخال غير معروف.');
    }

    // --- 3. مرحلة الترجمة لجميع المدخلات ---
    let translatedHtml = '';
    let characters = 0;

    try {
      const result = await translateHtml(extracted.html || `<p>${extracted.content}</p>`, { source, target });
      translatedHtml = result.translatedHtml;
      characters = result.characters || (extracted.content ? extracted.content.length : 0);
    } catch (htmlErr) {
      console.warn('[translate] HTML fallback triggered:', htmlErr);
      const rawText = extracted.content || extracted.title || 'محتوى الصفحة';
      const translatedText = await translateText(rawText, target, source);
      translatedHtml = `<div style="white-space: pre-wrap; font-family: sans-serif; line-height: 1.6; font-size: 16px;">${translatedText}</div>`;
      characters = rawText.length;
    }

    return NextResponse.json({
      title: extracted.title || 'صفحة مترجمة',
      originalHtml: extracted.originalHtml || extracted.html || `<p>${extracted.content || ''}</p>`,
      translatedHtml: translatedHtml || `<p>${extracted.content || ''}</p>`,
      characters: characters || 100,
      provider: getProviderId ? getProviderId() : 'google',
    });

  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error('[translate] unexpected error caught gracefully:', err);
    return NextResponse.json({ 
      error: err.message || 'تعذر إكمال عملية الترجمة، يرجى إعادة المحاولة.' 
    }, { status: 400 });
  }
}