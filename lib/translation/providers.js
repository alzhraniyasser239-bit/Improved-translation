// خوارزمية تقسيم النص الكبير إلى أجزاء صغيرة لتجنب أخطاء المزود
function splitTextIntoChunks(text, maxLength = 1000) {
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

export async function translateText(text, targetLang = 'ar', sourceLang = 'auto') {
  if (!text || !text.trim()) {
    return 'لا يوجد نص للترجمة.';
  }

  try {
    // 1. إذا كان النص كبيراً جداً، يتم تقسيمه وترجمة كل جزء على حدة
    if (text.length > 800) {
      const chunks = splitTextIntoChunks(text, 800);
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
        } catch (e) {
          translatedChunks.push(chunk);
        }
      }
      return translatedChunks.join(' ');
    }

    // 2. إذا كان النص قصيراً يتم ترجمته مباشرة
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('فشل الاستجابة من مزود الترجمة');
    }

    const data = await response.json();
    if (data && data[0]) {
      return data[0].map((item) => item[0]).join('');
    }

    return text;
  } catch (error) {
    console.error('Translation Engine Error:', error);
    return text; // إرجاع النص الأصلي كخيار أمان أخيراً دون إيقاف الصفحة
  }
}