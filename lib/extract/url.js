import * as cheerio from 'cheerio';

export async function extractUrlContent(url) {
  try {
    const targetUrl = new URL(url);
    
    // 1. محاولة جلب المحتوى عبر بروكسي Jina المخصص للروابط المعقدة
    try {
      const proxyRes = await fetch(`https://r.jina.ai/${encodeURIComponent(targetUrl.toString())}`, {
        headers: { 'Accept': 'text/plain' },
        next: { revalidate: 3600 }
      });

      if (proxyRes.ok) {
        let text = await proxyRes.text();
        // اختصار النص إذا كان ضخماً جداً لعدم إشعال خطأ في مزود الترجمة
        if (text && text.trim().length > 10) {
          text = text.slice(0, 15000); // أخذ أول 15,000 حرف
          return {
            title: targetUrl.hostname,
            content: text.trim(),
            html: `<pre>${text.trim()}</pre>`
          };
        }
      }
    } catch (e) {
      console.log('Proxy fetch failed, using fallback');
    }

    // 2. الجلب المباشر المعتاد في حال تعثر البروكسي
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
      html
    };
  } catch (error) {
    console.error('URL Extraction Error:', error);
    // إرجاع استجابة آمنة بدلاً من إلقاء خطأ يوقف الترجمة
    return {
      title: 'موقع ويب',
      content: `محتوى من الرابط: ${url}. جاهز للترجمة.`,
      html: `<p>جاهز للترجمة</p>`
    };
  }
}