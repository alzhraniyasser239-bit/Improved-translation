'use client';

import { AlertCircle, ArrowLeftRight, FileUp, Globe, Languages, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { getLanguage, isRtl } from '@/lib/languages';
import Dropzone from './Dropzone';
import ExportMenu from './ExportMenu';
import LanguageSelect from './LanguageSelect';
import PreviewPane from './PreviewPane';

const VIEWS = [
  { id: 'split', label: 'جنباً إلى جنب' },
  { id: 'original', label: 'الأصل' },
  { id: 'translated', label: 'الترجمة' },
];

function languageLabel(code) {
  if (code === 'auto') return 'تم الاكتشاف تلقائياً';
  const l = getLanguage(code);
  if (!l) return code;
  return l.native && l.native !== l.nameAr ? `${l.nameAr} · ${l.native}` : l.nameAr;
}

export default function Translator() {
  const [mode, setMode] = useState('url'); // 'url' | 'file'
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [source, setSource] = useState('auto');
  const [target, setTarget] = useState('ar');

  const [status, setStatus] = useState('idle'); // idle | loading | done
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { title, originalHtml, translatedHtml, target, source, characters, provider }
  const [view, setView] = useState('split');

  const canSubmit = status !== 'loading' && (mode === 'url' ? url.trim().length > 0 : Boolean(file));

  function swapLanguages() {
    if (source === 'auto') return;
    setSource(target);
    setTarget(source);
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setStatus('loading');

    const body = new FormData();
    body.set('mode', mode);
    body.set('source', source);
    body.set('target', target);
    if (mode === 'url') body.set('url', url.trim());
    else body.set('file', file);

    try {
      const res = await fetch('/api/translate', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشلت الترجمة. حاول مرة أخرى.');
      setResult({ ...data, source, target });
      setView('split');
      setStatus('done');
      // Bring the result into view on small screens.
      setTimeout(() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (err) {
      setError(err.message || 'فشلت الترجمة. حاول مرة أخرى.');
      setStatus(result ? 'done' : 'idle');
    }
  }

  return (
    <div className="mt-10">
      {/* ------------------------------ Input card ------------------------------ */}
      <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div role="tablist" aria-label="اختر ما تريد ترجمته" className="mb-5 flex w-full rounded-lg border border-line p-1 sm:inline-flex sm:w-auto">
          {[
            { id: 'url', label: 'صفحة ويب', icon: Globe },
            { id: 'file', label: 'ملف', icon: FileUp },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id);
                setError('');
              }}
              className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors sm:flex-none ${
                mode === id ? 'bg-cobalt text-white dark:text-[#091822]' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {mode === 'url' ? (
          <div>
            <label htmlFor="url" className="mb-1.5 block text-sm font-medium text-muted">
              عنوان الصفحة
            </label>
            {/* Web addresses are always left-to-right, even inside an Arabic page */}
            <input
              id="url"
              type="text"
              dir="ltr"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="field"
            />
          </div>
        ) : (
          <Dropzone file={file} onFile={setFile} onError={setError} />
        )}

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
          <LanguageSelect id="source" label="الترجمة من" value={source} onChange={setSource} allowAuto />
          <button
            type="button"
            onClick={swapLanguages}
            disabled={source === 'auto'}
            className="btn btn-ghost !px-3 self-center sm:self-end sm:!py-[11px]"
            aria-label="تبديل اللغتين"
            title={source === 'auto' ? 'اختر لغة المصدر أولاً لتتمكن من التبديل' : 'تبديل اللغتين'}
          >
            <ArrowLeftRight size={16} className="rotate-90 sm:rotate-0" />
          </button>
          <LanguageSelect id="target" label="الترجمة إلى" value={target} onChange={setTarget} />
        </div>

        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-danger">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <div className="mt-6">
          <button type="submit" disabled={!canSubmit} className="btn btn-primary w-full sm:w-auto sm:min-w-44">
            {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Languages size={16} />}
            {status === 'loading' ? 'جارٍ الترجمة…' : 'ترجمة'}
          </button>
        </div>
      </form>

      {/* ------------------------------ Loading ------------------------------ */}
      {status === 'loading' && (
        <div className="mt-8 grid gap-4 lg:grid-cols-2" aria-live="polite" aria-busy="true">
          <p className="sr-only">جارٍ قراءة المحتوى وترجمته. قد تستغرق المستندات الكبيرة دقيقة.</p>
          {[0, 1].map((i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-line bg-surface p-4">
              <div className="skeleton mb-4 h-5 w-1/3 rounded" />
              <div className="space-y-3">
                {[92, 100, 85, 96, 60, 100, 78].map((w, j) => (
                  <div key={j} className="skeleton h-3.5 rounded" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------ Result ------------------------------ */}
      {status !== 'loading' && result && (
        <div id="result" className="mt-10 scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl font-bold">{result.title}</h2>
              <p className="text-sm text-muted">
                تمت ترجمة {result.characters.toLocaleString('en-US')} حرفاً
                {result.provider === 'mock' && ' بالمحرك التجريبي. اضبط TRANSLATION_PROVIDER للحصول على ترجمة حقيقية.'}
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
              <div role="group" aria-label="طريقة العرض" className="flex w-full rounded-lg border border-line p-1 sm:inline-flex sm:w-auto">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={view === v.id}
                    onClick={() => setView(v.id)}
                    className={`min-h-[36px] flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
                      view === v.id ? 'bg-ink/10 text-ink' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <ExportMenu html={result.translatedHtml} title={result.title} lang={result.target} onError={setError} />
            </div>
          </div>

          <div className={`grid gap-4 ${view === 'split' ? 'lg:grid-cols-2' : ''}`}>
            {/* On narrow screens "جنباً إلى جنب" stacks the two panes vertically. */}
            {(view === 'split' || view === 'original') && (
              <PreviewPane
                label="الأصل"
                tone="original"
                language={languageLabel(result.source)}
                rtl={isRtl(result.source)}
                html={result.originalHtml}
              />
            )}
            {(view === 'split' || view === 'translated') && (
              <PreviewPane
                label="الترجمة"
                tone="translated"
                language={languageLabel(result.target)}
                rtl={isRtl(result.target)}
                html={result.translatedHtml}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
