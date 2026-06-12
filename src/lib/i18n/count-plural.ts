import type { Locale } from './config';
import type { TranslateFn } from '@/features/i18n/locale-context';

export type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export type CountEntity =
  | 'class'
  | 'student'
  | 'subject'
  | 'track'
  | 'assignment'
  | 'enrollment'
  | 'timetableSlot'
  | 'exam';

export function pluralForm(count: number, locale: Locale): PluralForm {
  if (count === 0) return 'zero';
  if (locale === 'ar') {
    if (count === 1) return 'one';
    if (count === 2) return 'two';
    if (count >= 3 && count <= 10) return 'few';
    return 'many';
  }
  if (count === 1) return 'one';
  return 'other';
}

function countPluralBaseKey(entity: CountEntity, variant: 'default' | 'linked'): string {
  if (variant === 'linked' && entity === 'track') {
    return 'admin.academicSetup.tracksLinkedSummary';
  }
  return `admin.academicSetup.countPlural.${entity}`;
}

export function formatCountLabel(
  t: TranslateFn,
  locale: Locale,
  entity: CountEntity,
  count: number,
  variant: 'default' | 'linked' = 'default',
): string {
  if (count <= 0) return '';
  const form = pluralForm(count, locale);
  const baseKey = countPluralBaseKey(entity, variant);
  const key = `${baseKey}.${form}`;
  if (form === 'one' || form === 'two') {
    return t(key);
  }
  return t(key, { count });
}

export function formatCardStatCount(
  t: TranslateFn,
  locale: Locale,
  entity: Extract<CountEntity, 'class' | 'student' | 'subject'>,
  count: number,
): string {
  if (count === 0) {
    return t(`admin.academicSetup.countPlural.${entity}.zero`);
  }
  return formatCountLabel(t, locale, entity, count);
}
