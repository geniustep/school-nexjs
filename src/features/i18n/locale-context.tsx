'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  type Locale,
  isLocale,
  localeDir,
} from '@/lib/i18n/config';
import { translateClassDistributionMessage } from '@/lib/i18n/class-distribution-messages';
import { translate } from '@/lib/i18n/messages';

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  dir: 'rtl' | 'ltr';
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const TRANSLATION_KEY_ALIASES: Record<string, string> = {
  'admin.account.fullName': 'admin.fullName',
  'admin.account.login': 'admin.account.loginName',
  'admin.account.emailPlaceholder': 'admin.staffCenter.smartCreate.emailPlaceholder',
  'admin.account.password': 'admin.academicSetup.staffPassword.password',
  'admin.account.passwordConfirm': 'admin.academicSetup.staffPassword.confirmPassword',
  'admin.staffCenter.permissionsTitle': 'admin.academicSetup.staffCapabilities.sectionTitle',
};

function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const fromStorage = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]+)`));
  if (match && isLocale(match[1])) return match[1];
  return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDir(locale);
  }, [locale, hydrated]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const t = useCallback<TranslateFn>(
    (key, params) => {
      const resolvedKey = TRANSLATION_KEY_ALIASES[key] ?? key;
      return (
        translateClassDistributionMessage(locale, resolvedKey, params) ??
        translate(locale, resolvedKey, params)
      );
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, dir: localeDir(locale) }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

export function useT(): TranslateFn {
  return useLocale().t;
}
