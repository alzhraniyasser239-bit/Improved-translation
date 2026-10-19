import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);
    
    // جلب أول عبر الوسيط السريع المخصص للروابط الثقيلة والمحمية
    const proxyUrl = `https://r.jina.ai/${encodeURIComponent(targetUrl.toString())}`;
    const proxyRes = await fetch(proxyUrl, {
      headers: { 'Accept': 'text/plain' },
      next: { revalidate: 3600 }
    });

    if (proxyRes.ok) {
      const text = await proxyRes.text();
      if (text && text.trim().length > 20) {
        return {
          title: targetUrl.hostname,
          content: text.trim(),
          html: `<pre>${text.trim()}</pre>`
        };
      }
    }

    // جلب احتياطي مباشر
    let response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();
    const $= cheerio.load(html);$('script, style, nav, footer, header, noscript, iframe').remove();

    const title = $('title').text().trim() || targetUrl.hostname;
    let text = $('article, main, body').text().trim().replace(/\s+/g, ' ');

    return {
      title,
      content: text || title,
      html
    };
  } catch (error) {
    console.error('URL Extraction Error:', error);
    return {
      title: url,
      content: `تعذر جلب النص الكامل من الرابط مباشرة: ${url}. يرجى التحقق من صحة الرابط.`,
      html: `<p>فشل جلب محتوى الرابط</p>`
    };
  }
}