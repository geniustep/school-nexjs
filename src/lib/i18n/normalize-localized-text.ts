import { DEFAULT_LOCALE, type Locale, isLocale } from '@/lib/i18n/config';

const LOCALE_ALIASES: Record<string, Locale> = {
  ar: 'ar',
  ar_001: 'ar',
  'ar-ma': 'ar',
  fr: 'fr',
  fr_fr: 'fr',
  'fr-fr': 'fr',
  en: 'en',
  en_us: 'en',
  'en-us': 'en',
  es: 'es',
  es_es: 'es',
  'es-es': 'es',
};

const DEFAULT_FALLBACK_LOCALES: Locale[] = ['ar', 'fr', 'en', 'es'];

function normalizeLocaleKey(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, '_');
}

function baseLanguage(value: string): string {
  return normalizeLocaleKey(value).split('_')[0] ?? '';
}

function resolveLocale(value: Locale | string): Locale {
  const normalized = normalizeLocaleKey(value);
  const direct = LOCALE_ALIASES[normalized];
  if (direct) return direct;

  const base = baseLanguage(normalized);
  const fromBase = LOCALE_ALIASES[base];
  if (fromBase) return fromBase;

  if (isLocale(value)) return value;
  if (isLocale(base)) return base;
  return DEFAULT_LOCALE;
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function pickFromLocalizedRecord(
  record: Record<string, unknown>,
  locale: Locale | string,
  fallbackLocales: Locale[],
): string | null {
  const current = resolveLocale(locale);
  const candidates = new Set<string>();

  for (const key of [String(locale), normalizeLocaleKey(String(locale)), current, ...fallbackLocales]) {
    candidates.add(key);
    candidates.add(baseLanguage(key));
  }

  for (const key of candidates) {
    const exact = readNonEmptyString(record[key]);
    if (exact) return exact;

    const normalizedKey = normalizeLocaleKey(key);
    for (const [recordKey, recordValue] of Object.entries(record)) {
      if (normalizeLocaleKey(recordKey) === normalizedKey) {
        const match = readNonEmptyString(recordValue);
        if (match) return match;
      }
    }
  }

  for (const value of Object.values(record)) {
    const first = readNonEmptyString(value);
    if (first) return first;
  }

  return null;
}

export interface NormalizeLocalizedTextOptions {
  fallback?: string | null;
  fallbackLocales?: Locale[];
}

/** Coerce backend text fields (string or locale map) to a single display string — never String(object). */
export function normalizeLocalizedText(
  value: unknown,
  locale: Locale | string = DEFAULT_LOCALE,
  options?: NormalizeLocalizedTextOptions,
): string | null {
  const fallback = options?.fallback ?? null;
  const fallbackLocales = options?.fallbackLocales ?? DEFAULT_FALLBACK_LOCALES;

  if (value == null) return fallback;

  const asString = readNonEmptyString(value);
  if (asString) return asString;

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return pickFromLocalizedRecord(value as Record<string, unknown>, locale, fallbackLocales) ?? fallback;
  }

  return fallback;
}
