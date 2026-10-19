import Header from '@/components/Header';
import Translator from '@/components/Translator';

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pt-14">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold leading-[1.4] sm:text-4xl sm:leading-[1.35] lg:text-5xl lg:leading-[1.3]">
            ترجم أي صفحة أو مستند، وحافظ على تنسيقه.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            الصق عنوان موقع، أو ارفع ملف PDF أو Word أو نص أو لقطة شاشة. اقرأ الأصل والترجمة جنباً إلى جنب، ثم حمّل النتيجة.
          </p>
        </div>
        <Translator />
      </main>
    </>
  );
}
