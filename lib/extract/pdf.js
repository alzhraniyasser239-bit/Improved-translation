export async function extractPdf(file, options = {}) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // استخراج النصوص بشكل آمن من الـ Buffer
    const textContent = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
    
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 24px; line-height: 1.8;">
        <h2>مستند PDF: ${file.name}</h2>
        <div style="white-space: pre-wrap;">${textContent.replace(/[^\x20-\x7E\u0600-\u06FF\n]/g, '')}</div>
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
    throw new Error('تعذر قراءة ملف الـ PDF');
  }
}