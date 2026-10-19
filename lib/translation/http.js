import { AppError } from '../errors.js';

/** POST JSON with a timeout and two retries for rate limits / temporary server errors. */
export async function postJson(url, { headers = {}, body, provider }) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      if (attempt === 2) throw new AppError(`لم تستجب خدمة الترجمة ${provider}.`, 504);
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }

    if (res.ok) return res.json();

    lastStatus = res.status;
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    const detail = await res.text().catch(() => '');
    console.error(`[${provider}] ${res.status}: ${detail.slice(0, 300)}`);
    if (res.status === 401 || res.status === 403) {
      throw new AppError(`تم رفض مفتاح ${provider}. تحقق من ملف .env.`, 502);
    }
    if (res.status === 456) throw new AppError(`انتهى رصيدك في ${provider}.`, 502);
    throw new AppError(`أعادت خدمة الترجمة ${provider} خطأً (${res.status}).`, 502);
  }
  throw new AppError(`خدمة الترجمة ${provider} مشغولة (${lastStatus}). حاول بعد قليل.`, 503);
}
