import * as cheerio from 'cheerio';
import { translateText } from '../translation/providers';

export async function translateHtml(htmlContent, { source = 'auto', target = 'ar' }) {
  if (!htmlContent) return { translatedHtml: '', characters: 0 };

  const $ = cheerio.load(htmlContent);
  let totalChars = 0;

  // تحديد العناصر النصية المراد ترجمتها مع ترك الصور والجداول والرسوم البيانية
  const textNodes = $('p, h1, h2, h3, h4, h5, h6, span, li, a, td, th, label, strong, em');

  for (let i = 0; i < textNodes.length; i++) {
    const el = $(textNodes[i]);
    // ترجمة العناصر التي تحتوي على نص مباشر فقط ولم يتم ترجمة أطفالها بعد
    if (el.children().length === 0 && el.text().trim().length > 0) {
      const originalText = el.text().trim();
      totalChars += originalText.length;
      
      try {
        const translated = await translateText(originalText, target, source);
        el.text(translated);
      } catch (e) {
        console.error('Error translating node:', e);
      }
    }
  }

  // إضافة دعم الاتجاه من اليمين لليسار إذا كانت اللغة الهدف عربية
  if (target === 'ar') {
    $('body, div').attr('dir', 'rtl');
  }

  return {
    translatedHtml: $.html(),
    characters: totalChars
  };
}