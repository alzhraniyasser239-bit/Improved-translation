'use client';

import { Download, MoreVertical, Plus, Share, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const SNOOZE_KEY = 'install-banner-snoozed-until';
const SNOOZE_DAYS = 14;

function detectEnvironment() {
  const ua = navigator.userAgent;
  const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // iPadOS reports as a Mac
  const ios = /iphone|ipad|ipod/i.test(ua) || touchMac;
  const ipad = /ipad/i.test(ua) || touchMac;
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const safariMac = !ios && /safari/i.test(ua) && !/chrome|chromium|android|crios|fxios|edg/i.test(ua);
  const firefox = /firefox|fxios/i.test(ua);
  return { ios, ipad, standalone, safariMac, firefox };
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cobalt text-sm font-bold text-white dark:text-[#091822]">
        {n}
      </span>
      <span className="pt-0.5 leading-snug">{children}</span>
    </li>
  );
}

function Instructions({ env }) {
  if (env.ios) {
    return (
      <>
        <ol className="space-y-4">
          <Step n={1}>
            اضغط على زر <strong>مشاركة</strong> (Share){' '}
            <Share size={16} className="inline -translate-y-px text-cobalt" />{' '}
            {env.ipad ? 'في أعلى يمين شاشة سفاري.' : 'في شريط أدوات سفاري.'}
          </Step>
          <Step n={2}>
            مرّر للأسفل واضغط على <strong>إضافة إلى الشاشة الرئيسية</strong> (Add to Home Screen){' '}
            <span className="inline-grid h-5 w-5 place-items-center rounded border border-ink/60 align-middle">
              <Plus size={13} />
            </span>
            .
          </Step>
          <Step n={3}>
            اضغط <strong>إضافة</strong>. سيظهر التطبيق في الشاشة الرئيسية ويفتح بدون أشرطة المتصفح.
          </Step>
        </ol>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          إذا فتحت الصفحة من داخل تطبيق آخر، افتحها في سفاري أولاً. التثبيت يعمل من المتصفح فقط.
        </p>
      </>
    );
  }
  if (env.safariMac) {
    return (
      <ol className="space-y-4">
        <Step n={1}>
          من شريط قوائم سفاري اختر <strong>ملف</strong>، ثم <strong>إضافة إلى Dock</strong>.
        </Step>
        <Step n={2}>
          اضغط <strong>إضافة</strong>. سيفتح التطبيق في نافذة مستقلة من الـ Dock.
        </Step>
      </ol>
    );
  }
  if (env.firefox) {
    return (
      <p className="leading-relaxed">
        على أندرويد افتح قائمة فايرفوكس <MoreVertical size={16} className="inline text-cobalt" /> ثم اضغط{' '}
        <strong>تثبيت</strong>. فايرفوكس على الكمبيوتر لا يدعم تثبيت تطبيقات الويب، فافتح الصفحة في كروم أو إيدج لتثبيتها.
      </p>
    );
  }
  return (
    <ol className="space-y-4">
      <Step n={1}>
        افتح قائمة المتصفح <MoreVertical size={16} className="inline text-cobalt" /> (أو أيقونة التثبيت في شريط العنوان
        على الكمبيوتر).
      </Step>
      <Step n={2}>
        اختر <strong>تثبيت التطبيق</strong> أو <strong>إضافة إلى الشاشة الرئيسية</strong>، ثم أكّد.
      </Step>
    </ol>
  );
}

export default function InstallApp() {
  const [env, setEnv] = useState(null); // null until the browser is known (avoids a hydration mismatch)
  const [deferred, setDeferred] = useState(null); // Chrome / Edge install prompt
  const [snoozed, setSnoozed] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setEnv(detectEnvironment());
    try {
      setSnoozed(Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now());
    } catch {
      setSnoozed(false);
    }

    const onPrompt = (e) => {
      e.preventDefault(); // we show our own button instead of the browser's mini-bar
      setDeferred(e);
    };
    const onInstalled = () => {
      setDeferred(null);
      setOpen(false);
      setEnv((prev) => (prev ? { ...prev, standalone: true } : prev));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  async function install() {
    if (!deferred) {
      setOpen(true);
      return;
    }
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null); // the browser only allows one prompt per event
  }

  function snooze() {
    setSnoozed(true);
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
    } catch {}
  }

  if (!env || env.standalone) return null; // already installed: show nothing
  const showBanner = !snoozed && (deferred || env.ios);

  return (
    <>
      <button type="button" onClick={install} className="btn btn-ghost !px-3 sm:!px-4" aria-label="تثبيت التطبيق">
        <Smartphone size={16} />
        <span className="hidden sm:inline">تثبيت التطبيق</span>
      </button>

      {showBanner && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-xl">
            <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">ثبّت المترجم الذكي</p>
              <p className="text-xs leading-snug text-muted">افتحه من الشاشة الرئيسية مثل أي تطبيق.</p>
            </div>
            <button type="button" onClick={install} className="btn btn-primary !px-3.5 !py-2">
              <Download size={15} />
              تثبيت
            </button>
            <button type="button" onClick={snooze} className="btn btn-ghost !px-2.5 !py-2" aria-label="ليس الآن">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            className="w-full max-w-md rounded-t-2xl bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:pb-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 id="install-title" className="font-display text-xl font-bold leading-tight">
                ثبّت المترجم الذكي
              </h2>
              <button type="button" autoFocus onClick={() => setOpen(false)} className="btn btn-ghost !px-2.5 !py-2" aria-label="إغلاق">
                <X size={16} />
              </button>
            </div>
            <Instructions env={env} />
          </div>
        </div>
      )}
    </>
  );
}
