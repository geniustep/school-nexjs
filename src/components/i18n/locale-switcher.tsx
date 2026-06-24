'use client';

import { LOCALES, LOCALE_LABELS } from '@/lib/i18n/config';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils/cn';

type LocaleSwitcherVariant = 'default' | 'compact' | 'login';

function GlobeIcon() {
  return (
    <svg
      className="locale-switcher__globe-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18" />
    </svg>
  );
}

export function LocaleSwitcher({
  compact = false,
  variant,
}: {
  compact?: boolean;
  variant?: LocaleSwitcherVariant;
}) {
  const { locale, setLocale, t } = useLocale();
  const resolved: LocaleSwitcherVariant = variant ?? (compact ? 'compact' : 'default');
  const isLogin = resolved === 'login';

  return (
    <label
      className={cn(
        'locale-switcher',
        resolved === 'compact' && 'locale-switcher--compact',
        isLogin && 'locale-switcher--login',
      )}
    >
      {isLogin ? (
        <span className="locale-switcher__globe">
          <GlobeIcon />
        </span>
      ) : !compact ? (
        <span className="locale-switcher__label">🌐</span>
      ) : null}

      <span className={cn(isLogin && 'locale-switcher__control')}>
        <select
          className={cn('locale-switcher__select', !isLogin && 'select')}
          value={locale}
          onChange={(e) => setLocale(e.target.value as typeof locale)}
          aria-label={t('common.language')}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </select>
        {isLogin ? (
          <span className="locale-switcher__chevron" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 4.5 6 8l3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </span>
    </label>
  );
}
