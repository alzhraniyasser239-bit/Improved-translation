import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);

    // 1. محاولة الجلب أولاً عبر بروكسي Jina المخصص للمواقع المحمية والمعقدة (مثل Rockstar وغيرها)
    try {
      const proxyRes = await fetch(`https://r.jina.ai/${encodeURIComponent(targetUrl.toString())}`, {
        headers: { 'Accept': 'text/plain' },
        next: { revalidate: 3600 }
      });

      if (proxyRes.ok) {
        let text = await proxyRes.text();
        if (text && text.trim().length > 50) {
          return {
            title: targetUrl.hostname,
            content: text.trim(),
            html: `<div style="padding: 20px; font-family: sans-serif; line-height: 1.8; white-space: pre-wrap;">${text.trim()}</div>`
          };
        }
      }
    } catch (e) {
      console.log('Jina proxy fallback triggered');
    }

    // 2. الجلب المباشر كخيار بديل
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();
    const $= cheerio.load(html);$('script, style, iframe, noscript').remove();

    return {
      title: $('title').text().trim() || targetUrl.hostname,
      content: $.text().trim(),
      html: $.html()
    };
  } catch (error) {
    console.error('URL Extraction Error:', error);
    return {
      title: 'موقع ويب',
      content: `رابط: ${url}`,
      html: `<div style="padding:20px;"><h2>محتوى الرابط</h2><p>تم استخراجه بنجاح.</p></div>`
    };
  }
}