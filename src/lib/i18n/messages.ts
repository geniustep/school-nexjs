import type { Locale } from './config';
import ar from '../../../messages/ar.json';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import fr from '../../../messages/fr.json';

export type Messages = typeof en;

export const MESSAGES: Record<Locale, Messages> = { ar, en, fr, es };

export function getMessage(messages: Messages, key: string): string | undefined {
  const parts = key.split('.');
  let cur: unknown = messages;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function normalizeArabicUiTerm(locale: Locale, value: string): string {
  if (locale !== 'ar') return value;
  if (value === 'عوامل تصفية إضافية') return 'فلاتر أخرى';
  if (value === 'إخفاء عوامل التصفية الإضافية') return 'إخفاء الفلاتر';
  if (value === 'الأسلاك المؤهل لها') return 'السلك';
  if (value === 'المستويات المؤهل لها') return 'المستوى';
  return value;
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw = normalizeArabicUiTerm(
    locale,
    getMessage(MESSAGES[locale], key) ??
      getMessage(MESSAGES.en, key) ??
      key,
  );
  if (!params) return raw;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    raw,
  );
}
