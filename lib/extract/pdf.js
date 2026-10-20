export async function extractPdf(file, options = {}) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // استيراد ديناميكي لمكتبة قراءة ملفات الـ PDF
    let pdfParse;
    try {
      pdfParse = (await import('pdf-parse')).default;
    } catch (e) {
      throw new Error('مكتبة pdf-parse غير مثبتة. يرجى تثبيتها عبر التيرمينال.');
    }

    // استخراج النصوص الحقيقية والمقروءة من الـ PDF
    const parsedData = await pdfParse(buffer);
    const textContent = parsedData.text || '';

    if (!textContent.trim()) {
      throw new Error('ملف الـ PDF لا يحتوي على نصوص قابلة للقراءة (قد يكون عبارة عن صور مسحوبة Scan).');
    }

    // تنظيف وتنسيق النص داخل قالب HTML أنيق
    const escapedText = textContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 28px; line-height: 1.8; color: #111; background: #fff; border-radius: 12px;">
        <h2 style="font-size: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">مستند PDF: ${file.name}</h2>
        <div style="white-space: pre-wrap; font-size: 15px;">${escapedText}</div>
      </div>
    `;

    return {
      title: file.name,
      content: textContent,
      html: htmlContent,
      originalHtml: htmlContent
    };

  } catch (error) {
    console.error('PDF Extraction Error:', error);
    
    const errHtml = `
      <div style="padding: 24px; font-family: sans-serif; background: #fff1f0; border: 1px solid #ffa39e; border-radius: 12px; color: #cf1322;">
        <h3 style="margin-top:0; font-size: 18px;">🚫 تعذر قراءة ملف الـ PDF:</h3>
        <p style="font-size: 15px; line-height: 1.6;">${error.message}</p>
        <p style="font-size: 13px; color: #888; margin-top: 10px;">إذا كانت المشكلة عدم توفر الحزمة، نفذ الأمر التالي في التيرمينال: <code>npm i pdf-parse</code></p>
      </div>
    `;

    return {
      title: file.name,
      content: error.message,
      html: errHtml,
      originalHtml: errHtml
    };
  }
}