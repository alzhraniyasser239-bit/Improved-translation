'use client';

import { AUTO, LANGUAGES } from '@/lib/languages';

/** Native <select>: fully accessible and works well with on-screen keyboards on phones. */
export default function LanguageSelect({ id, label, value, onChange, allowAuto = false }) {
  const options = allowAuto ? [AUTO, ...LANGUAGES] : LANGUAGES;
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field">
        {options.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native && l.native !== l.nameAr ? `${l.nameAr} (${l.native})` : l.nameAr}
          </option>
        ))}
      </select>
    </div>
  );
}
