'use client';

import { ChevronDown, Download, FileCode2, FileText, FileType2, Loader2, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { exportResult } from '@/lib/client/export';

const FORMATS = [
  { id: 'pdf', label: 'PDF', hint: 'تفتح نافذة الطباعة، اختر «حفظ كملف PDF»', icon: Printer },
  { id: 'docx', label: 'مستند Word (docx)', hint: 'مستند قابل للتعديل', icon: FileType2 },
  { id: 'txt', label: 'نص عادي (txt)', hint: 'نص فقط بدون تنسيق', icon: FileText },
  { id: 'html', label: 'صفحة HTML', hint: 'الصفحة كاملة بتنسيقها', icon: FileCode2 },
];

export default function ExportMenu({ html, title, lang, onError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const ref = useRef(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function run(format) {
    setOpen(false);
    setBusy(format);
    onError('');
    try {
      await exportResult(format, { html, title, lang });
    } catch (err) {
      onError(err.message || 'Export failed. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        type="button"
        className="btn btn-primary w-full sm:w-auto"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        disabled={Boolean(busy)}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        تحميل
        <ChevronDown size={15} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute start-0 z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-xl sm:start-auto sm:end-0"
        >
          {FORMATS.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              role="menuitem"
              type="button"
              onClick={() => run(id)}
              className="flex min-h-[52px] w-full items-start gap-3 px-4 py-3 text-start hover:bg-bg"
            >
              <Icon size={18} className="mt-0.5 shrink-0 text-cobalt" />
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
