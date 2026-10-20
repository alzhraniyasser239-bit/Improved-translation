function splitTextIntoChunks(text, maxLength = 600) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks.length > 0 ? chunks : [text.slice(0, maxLength)];
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function translateText(text, targetLang = 'ar', sourceLang = 'auto') {
  if (!text || !text.trim()) {
    return '';
  }

  try {
    const chunks = splitTextIntoChunks(text, 600);
    const translatedChunks = [];

    for (const chunk of chunks) {
      try {
        const res = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`
        );
        if (res.ok) {
          const data = await res.json();
          const translated = data[0].map((item) => item[0]).join('');
          translatedChunks.push(translated);
        } else {
          translatedChunks.push(chunk);
        }
        // مهلة قصيرة (150 ميلي ثانية) بين الطلبات لمنع حظر جوجل (Rate Limit)
        await sleep(150);
      } catch (e) {
        translatedChunks.push(chunk);
      }
    }
    return translatedChunks.join(' ');
  } catch (error) {
    console.error('Translation Engine Error:', error);
    return text;
  }
}

export function getProviderId() {
  return 'google';
}