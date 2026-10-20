import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);

    // محاولة الجلب بـ Headers متطورة تحاكي متصفح حقيقي لتفادي الحظر (Access Denied)
    let response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    // إذا تم حظر الطلب، نجرب وسيط بديل لجلب محتوى الصفحة وهيكلها دون حظر
    if (!response.ok || response.status === 403 || response.status === 401) {
      const altRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl.toString())}`);
      if (altRes.ok) {
        const data = await altRes.json();
        if (data && data.contents) {
          const $ = cheerio.load(data.contents);
          $('script, iframe, noscript').remove();$('[src], [href]').each((_, el) => {
            const $el =$(el);
            const src = $el.attr('src');
            const href = $el.attr('href');
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
              $el.attr('src', new URL(src, targetUrl.origin).href);
            }
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
              $el.attr('href', new URL(href, targetUrl.origin).href);
            }
          });

          return {
            title: $('title').text().trim() || targetUrl.hostname,
            content: $.text().trim(),
            html: $.html(),
            originalHtml: $.html()
          };
        }
      }
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, iframe, noscript').remove();

    // تصحيح مسارات الصور والملفات والروابط لتظل تعمل بالتصميم الكامل
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
      content: $.text().trim(),
      html: $.html(),
      originalHtml: $.html()
    };
  } catch (error) {
    console.error('URL Extraction Error:', error);
    return {
      title: 'صفحة ويب',
      content: `رابط: ${url}`,
      html: `<div style="padding:20px; font-family:sans-serif;"><h2>محتوى الرابط</h2><p>${url}</p></div>`
    };
  }
}