import dns from 'node:dns/promises';
import net from 'node:net';
import { AppError } from '../errors.js';

const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 20000;
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB of HTML is already a huge page

/** True for loopback, private, link-local and other non-public addresses. */
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true;
    if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true;
    if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
    return false;
  }
  return true; // unknown format: refuse
}

/** Blocks requests to internal network addresses (SSRF protection). */
async function assertPublicUrl(url) {
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new AppError('يمكن ترجمة العناوين التي تبدأ بـ http أو https فقط.');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    throw new AppError('هذا العنوان يشير إلى شبكة خاصة ولا يمكن جلبه.');
  }
  const addresses = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new AppError(`تعذّر العثور على الموقع "${host}". تأكد من العنوان.`);
  if (addresses.some((a) => isPrivateIp(a.address))) {
    throw new AppError('هذا العنوان يشير إلى شبكة خاصة ولا يمكن جلبه.');
  }
}

function decodeBody(bytes, contentType) {
  const charset = /charset=["']?([\w-]+)/i.exec(contentType || '')?.[1];
  // Sniff <meta charset> from the first bytes if the header did not say.
  let label = charset;
  if (!label) {
    const head = new TextDecoder('latin1').decode(bytes.slice(0, 2048));
    label = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1];
  }
  try {
    return new TextDecoder(label || 'utf-8').decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

/**
 * Fetches an HTML page with redirect handling, timeout, size cap and SSRF checks.
 * @returns {{ html: string, finalUrl: string }}
 */
export async function fetchHtml(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError('هذا ليس عنوان ويب صحيحاً. ابدأه بـ https://');
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);

    let res;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SmartTranslator/1.0)',
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'en,*;q=0.5',
        },
      });
    } catch (err) {
      if (err?.name === 'TimeoutError') throw new AppError('استغرق الموقع وقتاً طويلاً في الاستجابة.', 504);
      throw new AppError('تعذّر الوصول إلى هذا الموقع.', 502);
    }

    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location'), url);
      continue;
    }
    if (!res.ok) throw new AppError(`أعاد الموقع خطأ (${res.status}).`, 502);

    const type = res.headers.get('content-type') || '';
    if (!/html|xml|text\/plain/i.test(type)) {
      throw new AppError('هذا العنوان ليس صفحة ويب. لترجمة ملف، ارفعه من تبويب «ملف».');
    }

    // Read at most MAX_BYTES.
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new AppError('هذه الصفحة كبيرة جداً للترجمة.', 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    return { html: decodeBody(bytes, type), finalUrl: url.href };
  }
  throw new AppError('أعاد الموقع التوجيه مرات كثيرة جداً.', 502);
}
