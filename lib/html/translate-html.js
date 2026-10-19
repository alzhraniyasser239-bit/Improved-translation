import * as cheerio from 'cheerio';
import { translateText } from '../translation/providers';

export async function translateHtml(htmlContent, { source = 'auto', target = 'ar' }) {
  if (!htmlContent) return { translatedHtml: '', characters: 0 };

  const $ = cheerio.load(htmlContent);
  let totalChars = 0;

  // استخراج كافة العناصر النصية
  const nodesToTranslate = [];
  $('p, h1, h2, h3, h4, h5, h6, li, td, th, label, strong, em').each((_, el) => {
    const $el = $(el);
    if ($el.children().length === 0 && $el.text().trim().length > 0) {
      nodesToTranslate.push($el);
    }
  });

  // تحديد حد أقصى للترجمة دفعة واحدة تجنباً لتجاوز مهلة Vercel (Timeout)
  const maxNodes = Math.min(nodesToTranslate.length, 120);
  const selectedNodes = nodesToTranslate.slice(0, maxNodes);

  // ترجمة الدفعات بالتوازي لسرعة خارقة
  await Promise.all(
    selectedNodes.map(async ($el) => {
      const originalText = $el.text().trim();
      totalChars += originalText.length;
      try {
        const translated = await translateText(originalText, target, source);
        $el.text(translated);
      } catch (e) {
        // الحفاظ على النص الأصلي في حال التعثر لعدم إيقاف التحميل
      }
    })
  );

  if (target === 'ar') {
    $('body, div, p').attr('dir', 'rtl');
  }

  return {
    translatedHtml: $.html(),
    characters: totalChars
  };
}