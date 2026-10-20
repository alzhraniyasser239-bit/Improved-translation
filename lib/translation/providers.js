export async function translateText(text, targetLang = 'ar', sourceLang = 'auto') {
  if (!text || !text.trim()) return '';

  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.trim())}`
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        return data[0].map((item) => item[0]).join('');
      }
    }
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

export function getProviderId() {
  return 'google';
}