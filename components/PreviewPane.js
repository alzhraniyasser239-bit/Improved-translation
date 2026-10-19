'use client';

/**
 * Shows an HTML document in a sandboxed frame.
 * The sandbox has no "allow-scripts", so nothing from the translated page can run code;
 * links are allowed to open in a new tab.
 */
export default function PreviewPane({ label, language, tone, html, rtl }) {
  const bar = tone === 'translated' ? 'bg-marigold' : 'bg-cobalt';
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className={`h-1 ${bar}`} />
      <header className="flex items-baseline justify-between gap-3 px-4 py-3">
        <h2 className="font-display text-base font-bold">{label}</h2>
        <span className="truncate text-sm text-muted">
          {language}
        </span>
      </header>
      <iframe
        title={`معاينة ${label}`}
        srcDoc={html}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        className="h-[65dvh] min-h-[360px] w-full border-t border-line bg-white sm:h-[70dvh] sm:min-h-[420px]"
      />
    </section>
  );
}
