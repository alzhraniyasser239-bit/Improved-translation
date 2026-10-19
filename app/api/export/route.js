import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';
import { htmlToDocxBuffer } from '@/lib/export/docx';
import { htmlToText } from '@/lib/export/text';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_HTML_BYTES = 12 * 1024 * 1024;

const FORMATS = {
  docx: { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: 'docx' },
  txt: { type: 'text/plain; charset=utf-8', ext: 'txt' },
  html: { type: 'text/html; charset=utf-8', ext: 'html' },
};

/**
 * POST JSON { format: "docx" | "txt" | "html", html: string, lang: string, title?: string }
 * PDF is produced in the browser (print to PDF) because that is the only reliable way
 * to shape Arabic, Hebrew and other complex scripts without bundling fonts.
 */
export async function POST(request) {
  try {
    const { format, html, lang = 'en', title = 'Translation' } = await request.json();
    const spec = FORMATS[format];
    if (!spec) throw new AppError('صيغة التصدير غير مدعومة.');
    if (typeof html !== 'string' || !html.trim()) throw new AppError('لا يوجد شيء لتصديره.');
    if (html.length > MAX_HTML_BYTES) throw new AppError('هذه النتيجة كبيرة جداً للتصدير.', 413);

    let body;
    if (format === 'docx') body = await htmlToDocxBuffer(html, { title, lang });
    else if (format === 'txt') body = Buffer.from(htmlToText(html), 'utf8');
    else body = Buffer.from(html, 'utf8');

    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': spec.type,
        'Content-Disposition': `attachment; filename="translation.${spec.ext}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('[export] unexpected error', err);
    return NextResponse.json({ error: 'فشل التصدير. حاول مرة أخرى.' }, { status: 500 });
  }
}
