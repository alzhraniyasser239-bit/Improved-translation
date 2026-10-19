'use client';

import { FileText, Image as ImageIcon, UploadCloud, X } from 'lucide-react';
import { useRef, useState } from 'react';

const ACCEPT = '.pdf,.docx,.txt,.md,.csv,.html,.htm,.png,.jpg,.jpeg,.webp,.bmp,.gif';
const MAX_MB = 15;

function formatSize(bytes) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} ميغابايت`
    : `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
}

export default function Dropzone({ file, onFile, onError }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  function pick(f) {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      onError(`حجم الملف أكبر من ${MAX_MB} ميغابايت. اختر ملفاً أصغر.`);
      return;
    }
    onError('');
    onFile(f);
  }

  if (file) {
    const isImage = file.type.startsWith('image/');
    const Icon = isImage ? ImageIcon : FileText;
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-bg/60 p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cobalt/10 text-cobalt">
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{file.name}</p>
          <p className="text-sm text-muted">{formatSize(file.size)}</p>
        </div>
        <button type="button" onClick={() => onFile(null)} className="btn btn-ghost !px-2.5 !py-2" aria-label="إزالة الملف">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files?.[0]);
      }}
      className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
        over ? 'border-cobalt bg-cobalt/5' : 'border-line'
      }`}
    >
      <UploadCloud className="mx-auto text-cobalt" size={30} />
      <p className="mt-3 font-semibold">اختر ملفاً للترجمة</p>
      <p className="mt-1 text-sm text-muted">PDF أو Word (docx) أو نص أو HTML أو لقطة شاشة. حتى {MAX_MB} ميغابايت. على الكمبيوتر يمكنك أيضاً سحب الملف وإفلاته هنا.</p>
      <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary mt-4">
        اختيار ملف
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
