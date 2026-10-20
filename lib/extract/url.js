import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);

    // 1. محاولة الجلب بـ Headers تحاكي متصفحاً حقيقياً
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });

    // كشف أسباب الرفض الحقيقية من السيرفر المصدر
    if (response.status === 403 || response.status === 401) {
      const serverHeader = response.headers.get('server') || '';
      let realReason = 'تم رفض الطلب من قبل السيرفر المصدر (Access Denied / 403 Forbidden).';
      
      if (serverHeader.includes('cloudflare')) {
        realReason = 'تعذر الترجمة: الموقع يحظر البوتات والسيرفرات عبر حماية (Cloudflare Bot Management).';
      } else if (serverHeader.includes('AkamaiNetSession') || serverHeader.includes('GSE')) {
        realReason = 'تعذر الترجمة: الموقع يحمي محتواه بـ (Akamai/Edge Firewall).';
      }

      return {
        title: 'تعذر جلب الموقع',
        content: realReason,
        html: `
          <div style="padding: 24px; font-family: sans-serif; background: #fff1f0; border: 1px solid #ffa39e; border-radius: 12px; color: #cf1322;">
            <h3 style="margin-top:0; font-size: 18px;">🚫 سبب عدم إكمال الترجمة:</h3>
            <p style="font-size: 15px; line-height: 1.6; margin-bottom: 0;">${realReason}</p>
            <p style="font-size: 13px; color: #8c8c8c; margin-top: 10px;">الرابط المحاول: ${url}</p>
          </div>
        `
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // فحص إذا كانت الصفحة سوداء/فارغة وتعتمد كلياً على JavaScript
    $('script, iframe, noscript, style').remove();
    const bodyText = $('body').text().trim().replace(/\s+/g, ' ');

    if (bodyText.length < 20) {
      const jsReason = 'تعذر الترجمة: هذا الموقع مبني بتقنية (SPA / Client-side Rendered) ويعتمد كلياً على تشغيل JavaScript داخل متصفح حقيقي لعرض المحتوى.';
      return {
        title: 'صفحة تفاعلية معقدة',
        content: jsReason,
        html: `
          <div style="padding: 24px; font-family: sans-serif; background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 12px; color: #0050b3;">
            <h3 style="margin-top:0; font-size: 18px;">⚠️ سبب عدم ظهور المحتوى:</h3>
            <p style="font-size: 15px; line-height: 1.6; margin-bottom: 0;">${jsReason}</p>
          </div>
        `
      };
    }

    // تصحيح مسارات الصور والتنسيقات للروابط الشغالة
    $('[src], [href]').each((_, el) => {
      const $el =$(el);
      const src = $el.attr('src');
      const href = $el.attr('href');

      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        $el.attr('src', new URL(src, targetUrl.origin).href);
      }
      if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('javascript:')) {
        $el.attr('href', new URL(href, targetUrl.origin).href);
      }
    });

    const title = $('title').text().trim() || targetUrl.hostname;

    return {
      title,
      content: bodyText,
      html: $.html(),
      originalHtml: $.html()
    };

  } catch (error) {
    console.error('URL Extraction Error:', error);
    const failReason = error.name === 'TimeoutError' 
      ? 'استغرق الموقع وقتاً طويلاً جداً في الاستجابة (Timeout).' 
      : `حدث خطأ أثناء الاتصال بالموقع: ${error.message}`;

    return {
      title: 'خطأ في الاتصال',
      content: failReason,
      html: `
        <div style="padding: 24px; font-family: sans-serif; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 12px; color: #d48800;">
          <h3 style="margin-top:0; font-size: 18px;">⚠️ سبب الفشل:</h3>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 0;">${failReason}</p>
        </div>
      `
    };
  }
}