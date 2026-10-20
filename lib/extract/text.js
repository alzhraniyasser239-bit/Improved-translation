export async function extractText(file) {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const textContent = buffer.toString('utf-8');
    const fileName = (file.name || '').toLowerCase();

    let htmlContent = '';

    // إذا كان الملف عبارة عن جدول بيانات CSV
    if (fileName.endsWith('.csv')) {
      const lines = textContent.split(/\r?\n/).filter(line => line.trim().length > 0);
      let tableRows = lines.map((line, index) => {
        const cells = line.split(',');
        const tag = index === 0 ? 'th' : 'td';
        return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
      }).join('');

      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>جدول البيانات المستخرج</h2>
          <table style="width:100%; border-collapse: collapse; margin-top: 15px;">
            ${tableRows}
          </table>
        </div>
      `;
    } else {
      // إذا كان ملف نصي عادي TXT
      const escapedText = textContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

      htmlContent = `
        <div style="font-family: sans-serif; padding: 24px; line-height: 1.8; white-space: pre-wrap;">
          ${escapedText}
        </div>
      `;
    }

    return {
      title: file.name,
      content: textContent,
      html: htmlContent,
      originalHtml: htmlContent
    };

  } catch (error) {
    console.error('Text Extraction Error:', error);
    throw new Error('تعذر قراءة الملف النصي');
  }
}