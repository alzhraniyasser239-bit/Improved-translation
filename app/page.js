import Header from '@/components/Header';
import Translator from '@/components/Translator';

export default function Home() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pt-14">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold leading-[1.4] sm:text-4xl sm:leading-[1.3]">
            ترجم أي صفحة أو مستند، وحافظ على تنسيقه.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            أو نص أو لقطة شاشة. اقرأ الأصل والترجمة جنباً إلى جنب، ثم حقل النتيجة الصق عنوان موقع، أو ارفع ملف.
          </p>
        </div>
        <Translator />
      </main>

      {/* حقوق الملكية وتصميم وتطوير وهاج الزهراني */}
      <footer style={{ textAlign: 'center', padding: '24px', fontSize: '14px', color: '#888', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: '40px' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          © 2026 جميع الحقوق محفوظة | تصميم وتطوير: <span style={{ fontWeight: '600', color: '#3b82f6' }}>وهاج الزهراني</span>
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '13px' }}>
          <a href="https://www.snapchat.com/add/WE7AG" target="_blank" rel="noopener noreferrer" style={{ color: '#eab308', textDecoration: 'none' }}>
            👻 سناب شات: WE7AJ
          </a>
        </div>
      </footer>
    </>
  );
}