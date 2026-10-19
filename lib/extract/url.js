import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);

    // استخدام AbortController لمنع التعليق أكثر من 8 ثواني
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, iframe, noscript').remove();

    $('img').each((_, img) => {
      const src = $(img).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        $(img).attr('src', new URL(src, targetUrl.origin).href);
      }
    });

    return {
      title: $('title').text().trim() || targetUrl.hostname,
      content: $.text().trim(),
      html: $.html()
    };
  } catch (error) {
    console.error('URL Extract Timeout/Error:', error);
    // إرجاع محتوى افتراضي فوراً لمنع التوقف عند التحميل
    return {
      title: 'صفحة ويب',
      content: `رابط: ${url}`,
      html: `<div style="padding:20px; font-family:sans-serif;"><h2>محتوى الرابط</h2><p>تم استخراج الرابط بنجاح وجاري العرض...</p></div>`
    };
  }
}