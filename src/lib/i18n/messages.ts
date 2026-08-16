import type { Locale } from './config';
import ar from '../../../messages/ar.json';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import fr from '../../../messages/fr.json';

export type Messages = typeof en;

export const MESSAGES: Record<Locale, Messages> = { ar, en, fr, es };

const INLINE_MESSAGES: Record<Locale, Record<string, string>> = {
  ar: {
    'nav.library': 'المكتبة',
    'nav.entryRequirements': 'تجهيزات الدخول المدرسي',
    'nav.curriculumRequirements': 'المقرر والتجهيزات',
    'admin.director.financeTitle': 'المالية والتحصيل',
    'admin.director.financeDesc': 'تحصيل اليوم وهذا الشهر، مع المتبقي والمتأخرات.',
    'admin.director.financeCollectionsGroup': 'التحصيل',
    'admin.director.financePositionGroup': 'الوضع المالي',
    'admin.director.financeCollectedToday': 'محصل اليوم',
    'admin.director.financeCollectedMonth': 'محصل هذا الشهر',
    'admin.pedagogicalDashboard.dailyPulseTitle': 'نبض اليوم',
    'admin.pedagogicalDashboard.homeworkPublishedCompact': 'منشورة: {count}',
  },
  en: {
    'nav.library': 'Library',
    'nav.entryRequirements': 'School entry requirements',
    'nav.curriculumRequirements': 'Curriculum & requirements',
    'admin.director.financeTitle': 'Finance & collections',
    'admin.director.financeDesc': 'Collections today and this month, with remaining and overdue balances.',
    'admin.director.financeCollectionsGroup': 'Collections',
    'admin.director.financePositionGroup': 'Financial position',
    'admin.director.financeCollectedToday': 'Collected today',
    'admin.director.financeCollectedMonth': 'Collected this month',
    'admin.pedagogicalDashboard.dailyPulseTitle': "Today's pulse",
    'admin.pedagogicalDashboard.homeworkPublishedCompact': 'Published: {count}',
  },
  fr: {
    'nav.library': 'Bibliothèque',
    'nav.entryRequirements': 'Fournitures de rentrée',
    'nav.curriculumRequirements': 'Programme et fournitures',
    'admin.director.financeTitle': 'Finances et encaissements',
    'admin.director.financeDesc': 'Encaissements du jour et du mois, avec le restant et les impayés.',
    'admin.director.financeCollectionsGroup': 'Encaissements',
    'admin.director.financePositionGroup': 'Situation financière',
    'admin.director.financeCollectedToday': "Encaissé aujourd'hui",
    'admin.director.financeCollectedMonth': 'Encaissé ce mois',
    'admin.pedagogicalDashboard.dailyPulseTitle': 'Le pouls du jour',
    'admin.pedagogicalDashboard.homeworkPublishedCompact': 'Publiés : {count}',
  },
  es: {
    'nav.library': 'Biblioteca',
    'nav.entryRequirements': 'Material escolar',
    'nav.curriculumRequirements': 'Currículo y materiales',
    'admin.director.financeTitle': 'Finanzas y cobros',
    'admin.director.financeDesc': 'Cobros de hoy y de este mes, junto con el saldo pendiente y los atrasos.',
    'admin.director.financeCollectionsGroup': 'Cobros',
    'admin.director.financePositionGroup': 'Situación financiera',
    'admin.director.financeCollectedToday': 'Cobrado hoy',
    'admin.director.financeCollectedMonth': 'Cobrado este mes',
    'admin.pedagogicalDashboard.dailyPulseTitle': 'Pulso de hoy',
    'admin.pedagogicalDashboard.homeworkPublishedCompact': 'Publicadas: {count}',
  },
};

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
      INLINE_MESSAGES[locale][key] ??
      getMessage(MESSAGES.en, key) ??
      INLINE_MESSAGES.en[key] ??
      key,
  );
  if (!params) return raw;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    raw,
  );
}
