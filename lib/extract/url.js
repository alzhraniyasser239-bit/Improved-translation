import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // إزالة السكريبتات والإعلانات فقط للحفاظ على استقرار الصفحة وإبقاء الصور والتنسيقات
    $('script, iframe, noscript').remove();

    // تعديل مسارات الصور والملفات النسبيّة لتصبح روابط كاملة حتى تظهر الصور بشكل صحيح
    $('img').each((_, img) => {
      const src = $(img).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        $(img).attr('src', new URL(src, targetUrl.origin).href);
      }
    });

    const title = $('title').text().trim() || targetUrl.hostname;

    return {
      title,
      content: $.text().trim(),
      html: $.html()
    };
  } catch (error) {
    console.error('URL Extract Error:', error);
    return {
      title: 'موقع ويب',
      content: `رابط: ${url}`,
      html: `<p>تعذر جلب التصميم الكامل لهذا الرابط: ${url}</p>`
    };
  }
}