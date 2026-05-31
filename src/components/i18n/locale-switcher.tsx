'use client';

import { LOCALES, LOCALE_LABELS } from '@/lib/i18n/config';
import { useLocale } from '@/features/i18n/locale-context';

export function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <label className={compact ? 'locale-switcher locale-switcher--compact' : 'locale-switcher'}>
      {!compact && <span className="locale-switcher__label">🌐</span>}
      <select
        className="select locale-switcher__select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        aria-label="Language"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
