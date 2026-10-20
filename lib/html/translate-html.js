import * as cheerio from 'cheerio';
import { translateText } from '../translation/providers';

export async function translateHtml(htmlContent, { source = 'auto', target = 'ar' }) {
  if (!htmlContent) return { translatedHtml: '', characters: 0 };

  const $ = cheerio.load(htmlContent);
  let totalChars = 0;

  // استخراج العقد النصية المباشرة في شجرة DOM
  const elementsToTranslate = [];
  $('p, h1, h2, h3, h4, h5, h6, li, td, th, span, a, label, strong, em, button, caption').each((_, el) => {
    const $el = $(el);
    if ($el.children().length === 0 && $el.text().trim().length > 0) {
      elementsToTranslate.push($el);
    }
  });

  // معالجة الترجمة بدفعات سريعة جداً (Batches of 15)
  const batchSize = 15;
  for (let i = 0; i < elementsToTranslate.length; i += batchSize) {
    const batch = elementsToTranslate.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ($el) => {
        const originalText = $el.text().trim();
        if (originalText) {
          totalChars += originalText.length;
          try {
            const translated = await translateText(originalText, target, source);
            $el.text(translated);
          } catch (e) {
            // الإبقاء على النص الأصلي في حال الفشل
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