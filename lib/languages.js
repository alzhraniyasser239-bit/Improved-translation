/**
 * Supported languages.
 *  nameAr – Arabic name shown in the interface
 *  code  – our canonical code (BCP-47 style, also what Google Translate expects)
 *  rtl   – right-to-left script
 *  ocr   – Tesseract language pack used when reading images in this language
 */
export const LANGUAGES = [
  { code: 'en', nameAr: 'الإنجليزية', name: 'English', native: 'English', ocr: 'eng' },
  { code: 'ar', nameAr: 'العربية', name: 'Arabic', native: 'العربية', rtl: true, ocr: 'ara' },
  { code: 'fr', nameAr: 'الفرنسية', name: 'French', native: 'Français', ocr: 'fra' },
  { code: 'es', nameAr: 'الإسبانية', name: 'Spanish', native: 'Español', ocr: 'spa' },
  { code: 'it', nameAr: 'الإيطالية', name: 'Italian', native: 'Italiano', ocr: 'ita' },
  { code: 'ru', nameAr: 'الروسية', name: 'Russian', native: 'Русский', ocr: 'rus' },
  { code: 'de', nameAr: 'الألمانية', name: 'German', native: 'Deutsch', ocr: 'deu' },
  { code: 'pt', nameAr: 'البرتغالية', name: 'Portuguese', native: 'Português', ocr: 'por' },
  { code: 'nl', nameAr: 'الهولندية', name: 'Dutch', native: 'Nederlands', ocr: 'nld' },
  { code: 'pl', nameAr: 'البولندية', name: 'Polish', native: 'Polski', ocr: 'pol' },
  { code: 'uk', nameAr: 'الأوكرانية', name: 'Ukrainian', native: 'Українська', ocr: 'ukr' },
  { code: 'tr', nameAr: 'التركية', name: 'Turkish', native: 'Türkçe', ocr: 'tur' },
  { code: 'fa', nameAr: 'الفارسية', name: 'Persian', native: 'فارسی', rtl: true, ocr: 'fas' },
  { code: 'he', nameAr: 'العبرية', name: 'Hebrew', native: 'עברית', rtl: true, ocr: 'heb' },
  { code: 'ur', nameAr: 'الأردية', name: 'Urdu', native: 'اردو', rtl: true, ocr: 'urd' },
  { code: 'hi', nameAr: 'الهندية', name: 'Hindi', native: 'हिन्दी', ocr: 'hin' },
  { code: 'bn', nameAr: 'البنغالية', name: 'Bengali', native: 'বাংলা', ocr: 'ben' },
  { code: 'zh-CN', nameAr: 'الصينية (المبسطة)', name: 'Chinese (Simplified)', native: '简体中文', ocr: 'chi_sim' },
  { code: 'ja', nameAr: 'اليابانية', name: 'Japanese', native: '日本語', ocr: 'jpn' },
  { code: 'ko', nameAr: 'الكورية', name: 'Korean', native: '한국어', ocr: 'kor' },
  { code: 'id', nameAr: 'الإندونيسية', name: 'Indonesian', native: 'Bahasa Indonesia', ocr: 'ind' },
  { code: 'ms', nameAr: 'الماليزية', name: 'Malay', native: 'Bahasa Melayu', ocr: 'msa' },
  { code: 'vi', nameAr: 'الفيتنامية', name: 'Vietnamese', native: 'Tiếng Việt', ocr: 'vie' },
  { code: 'th', nameAr: 'التايلاندية', name: 'Thai', native: 'ไทย', ocr: 'tha' },
  { code: 'sv', nameAr: 'السويدية', name: 'Swedish', native: 'Svenska', ocr: 'swe' },
  { code: 'da', nameAr: 'الدنماركية', name: 'Danish', native: 'Dansk', ocr: 'dan' },
  { code: 'no', nameAr: 'النرويجية', name: 'Norwegian', native: 'Norsk', ocr: 'nor' },
  { code: 'fi', nameAr: 'الفنلندية', name: 'Finnish', native: 'Suomi', ocr: 'fin' },
  { code: 'el', nameAr: 'اليونانية', name: 'Greek', native: 'Ελληνικά', ocr: 'ell' },
  { code: 'cs', nameAr: 'التشيكية', name: 'Czech', native: 'Čeština', ocr: 'ces' },
  { code: 'ro', nameAr: 'الرومانية', name: 'Romanian', native: 'Română', ocr: 'ron' },
  { code: 'hu', nameAr: 'المجرية', name: 'Hungarian', native: 'Magyar', ocr: 'hun' },
  { code: 'bg', nameAr: 'البلغارية', name: 'Bulgarian', native: 'Български', ocr: 'bul' },
  { code: 'sw', nameAr: 'السواحيلية', name: 'Swahili', native: 'Kiswahili', ocr: 'swa' },
];

export const AUTO = { code: 'auto', name: 'Detect language', nameAr: 'اكتشاف تلقائي', native: '' };

export function getLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || null;
}

export function isRtl(code) {
  return Boolean(getLanguage(code)?.rtl);
}

export function isSupported(code) {
  return code === 'auto' || Boolean(getLanguage(code));
}
