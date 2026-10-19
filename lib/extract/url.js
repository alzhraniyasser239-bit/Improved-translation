import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeoutId);

    const html = await response.text();
    const $ = cheerio.load(html);

    // إزالة السكريبتات التنفيذية فقط لمنع التضارب، والإبقاء على المخططات والتنسيقات والصور والجداول
    $('script, iframe, noscript').remove();

    // تصحيح مسارات الصور والملفات والـ CSS لتعمل التنسيقات بصرية كما هي في الموقع الأصلي
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
    console.error('Mirror Extraction Fallback:', error);
    return {
      title: 'صفحة ويب',
      content: `رابط: ${url}`,
      html: `<div style="padding: 20px; font-family: sans-serif;"><h2>تعذر جلب التنسيق المباشر</h2><p>الرابط: ${url}</p></div>`
    };
  }
}