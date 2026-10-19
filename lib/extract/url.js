import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);
    
    // جلب عبر بروكسي Jina السريع للمواقع المحمية والمعقدة
    try {
      const proxyRes = await fetch(`https://r.jina.ai/${encodeURIComponent(targetUrl.toString())}`, {
        headers: { 'Accept': 'text/plain' },
        next: { revalidate: 3600 }
      });

      if (proxyRes.ok) {
        let text = await proxyRes.text();
        if (text && text.trim().length > 10) {
          text = text.slice(0, 15000);
          return {
            title: targetUrl.hostname,
            content: text.trim(),
            html: `<pre style="white-space: pre-wrap; word-break: break-word;">${text.trim()}</pre>`
          };
        }
      }
    } catch (e) {
      console.log('Proxy fetch failed, using cheerio fallback');
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();
    const $= cheerio.load(html);$('script, style, nav, footer, header, noscript, iframe').remove();

    const title = $('title').text().trim() || targetUrl.hostname;
    let text = $('body').text().trim().replace(/\s+/g, ' ');

    return {
      title,
      content: text.slice(0, 15000) || title,
      html: `<p>${text.slice(0, 15000) || title}</p>`
    };
  } catch (error) {
    console.error('URL Extraction Error:', error);
    return {
      title: 'موقع ويب',
      content: `محتوى من الرابط: ${url}`,
      html: `<p>محتوى من الرابط: ${url}</p>`
    };
  }
}