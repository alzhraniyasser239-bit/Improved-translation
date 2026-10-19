/** Browser-side helpers for downloading and printing the translated result. */

function slugify(text) {
  return (
    String(text || '')
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'translation'
  );
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * PDF: the translated page is loaded into a hidden frame and the browser's print dialog
 * opens. Choose "Save as PDF". The browser handles Arabic shaping and RTL perfectly.
 */
function printHtml(html) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    frame.onload = () => {
      setTimeout(() => {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        resolve();
        setTimeout(() => frame.remove(), 60000);
      }, 300);
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

/** @param {'pdf'|'docx'|'txt'|'html'} format */
export async function exportResult(format, { html, title, lang }) {
  if (format === 'pdf') return printHtml(html);

  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, html, title, lang }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'فشل التصدير. حاول مرة أخرى.');
  }
  download(await res.blob(), `${slugify(title)}-${lang}.${format}`);
}
