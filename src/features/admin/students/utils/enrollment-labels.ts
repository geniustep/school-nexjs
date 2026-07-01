import type { TranslateFn } from '@/features/i18n/locale-context';
import type { StudentRefOption } from '@/types/student-360';
import { optionLabel } from './student-profile';

function registrationTypeI18nLabel(t: TranslateFn, value: string): string | null {
  const trimmed = value.trim();
  for (const candidate of [trimmed, trimmed.toLowerCase()]) {
    const key = `admin.student360.registrationTypes.${candidate}`;
    const label = t(key);
    if (label !== key) return label;
  }
  return null;
}

export function registrationTypeLabel(
  t: TranslateFn,
  value: string | null | undefined,
  options?: StudentRefOption[],
): string {
  if (!value?.trim()) return '';
  const i18nLabel = registrationTypeI18nLabel(t, value);
  if (i18nLabel) return i18nLabel;
  if (options?.length) {
    const fromOptions = optionLabel(options, value);
    if (fromOptions !== value) return fromOptions;
  }
  return value.replace(/_/g, ' ');
}
