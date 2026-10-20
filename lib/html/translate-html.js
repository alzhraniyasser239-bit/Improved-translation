import * as cheerio from 'cheerio';
import { translateText } from '../translation/providers';

export async function translateHtml(htmlContent, { source = 'auto', target = 'ar' }) {
  if (!htmlContent) return { translatedHtml: '', characters: 0 };

  const $ = cheerio.load(htmlContent);
  let totalChars = 0;

  // جلب كافة العناصر التي تحتوي على نصوص تشمل الجداول والمخططات
  const textElements = [];
  $('td, th, p, h1, h2, h3, h4, h5, h6, span, a, li, button, caption, figcaption, text').each((_, el) => {
    const $el = $(el);
    if ($el.children().length === 0 && $el.text().trim().length > 0) {
      textElements.push($el);
    }
  });

  // معالجة العناصر في مجموعات بالتوازي لسرعة العرض دون تجاوز مهلة Vercel
  const batchSize = 30;
  for (let i = 0; i < textElements.length; i += batchSize) {
    const batch = textElements.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ($el) => {
        const originalText = $el.text().trim();
        if (originalText.length > 0) {
          totalChars += originalText.length;
          try {
            const translated = await translateText(originalText, target, source);
            $el.text(translated);
          } catch (e) {
            // الحفاظ على النص في الهيكل الأصلي عند التعثر
          }
        }
      })
    );
  }

  if (target === 'ar') {
    $('body').attr('dir', 'rtl');
  }

  return {
    translatedHtml: $.html(),
    characters: totalChars
  };
}