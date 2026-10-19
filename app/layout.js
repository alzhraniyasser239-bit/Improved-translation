import './globals.css';
import { IBM_Plex_Sans_Arabic, Noto_Kufi_Arabic } from 'next/font/google';
import PwaRegister from '@/components/PwaRegister';

// Arabic-first fonts: Kufi for headings, Plex Arabic for reading text.
const display = Noto_Kufi_Arabic({ subsets: ['arabic', 'latin'], variable: '--font-display', display: 'swap' });
const body = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'المترجم الذكي للمستندات والصفحات',
  applicationName: 'المترجم الذكي',
  description: 'ترجم أي صفحة ويب أو مستند مع الحفاظ على تنسيقه، ثم حمّل النتيجة بصيغة PDF أو Word أو نص أو HTML.',
  manifest: '/manifest.json',
  formatDetection: { telephone: false },
  // iOS home-screen behaviour (Safari ignores most of the manifest)
  appleWebApp: { capable: true, title: 'المترجم', statusBarStyle: 'default' },
  icons: {
    icon: [
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // use the full screen on phones with a notch; safe-area padding is applied in CSS
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EAEFF3' },
    { media: '(prefers-color-scheme: dark)', color: '#091822' },
  ],
};

// Runs before first paint so the page never flashes the wrong theme.
const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
