import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(12000)
    });

    // 1. التعامل مع الرفض والحظر من السيرفر المصدر
    if (response.status === 403 || response.status === 401) {
      const server = response.headers.get('server') || '';
      let reason = 'الموقع يمنع الطلبات الخارجية والمباشرة (403 Forbidden).';
      if (server.includes('cloudflare')) {
        reason = 'تعذر الجلب: الموقع محمي بـ (Cloudflare Bot Shield) ويمنع الوصول التلقائي.';
      } else if (server.includes('Akamai')) {
        reason = 'تعذر الجلب: الموقع محمي بجدار حماية (Akamai Edge Firewall).';
      }

      return {
        title: 'تعذر جلب الموقع',
        content: reason,
        html: `<div style="padding: 24px; font-family: sans-serif; background: #fff1f0; border: 1px solid #ffa39e; border-radius: 12px; color: #cf1322;">
          <h3 style="margin-top:0;">🚫 سبب عدم الترجمة:</h3>
          <p>${reason}</p>
        </div>`
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 2. كشف صفحات JavaScript الفارغة (SPA)
    $('script, iframe, noscript, style').remove();
    const cleanText = $('body').text().trim().replace(/\s+/g, ' ');

    if (cleanText.length < 30) {
      const spaReason = 'تعذر الترجمة: الموقع يعتمد كلياً على تقنية (SPA / JavaScript Client Rendering) ولا يرسل نصوصه في كود HTML الأولي.';
      return {
        title: 'صفحة تفاعلية معقدة',
        content: spaReason,
        html: `<div style="padding: 24px; font-family: sans-serif; background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 12px; color: #0050b3;">
          <h3 style="margin-top:0;">⚠️ سبب عدم ظهور المحتوى:</h3>
          <p>${spaReason}</p>
        </div>`
      };
    }

    // 3. تعديل روابط الصور والـ CSS لتظهر بأسلوب المرآة الأصلي
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
      content: cleanText,
      html: $.html(),
      originalHtml: $.html()
    };

  } catch (error) {
    console.error('Extraction Error:', error);
    const failReason = error.name === 'TimeoutError'
      ? 'تجاوز الموقع مهلة الاستجابة المحددة (Timeout).'
      : `حدث خطأ في الاتصال: ${error.message}`;

    return {
      title: 'خطأ في الاتصال',
      content: failReason,
      html: `<div style="padding: 24px; font-family: sans-serif; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 12px; color: #d48800;">
        <h3 style="margin-top:0;">⚠️ سبب الفشل:</h3>
        <p>${failReason}</p>
      </div>`
    };
  }
}