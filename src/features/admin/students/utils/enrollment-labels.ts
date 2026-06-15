import type { TranslateFn } from '@/features/i18n/locale-context';
import type { StudentRefOption } from '@/types/student-360';
import { optionLabel } from './student-profile';

export function registrationTypeLabel(
  t: TranslateFn,
  value: string | null | undefined,
  options?: StudentRefOption[],
): string {
  if (!value?.trim()) return '';
  if (options?.length) {
    const fromOptions = optionLabel(options, value);
    if (fromOptions !== value) return fromOptions;
  }
  const key = `admin.student360.registrationTypes.${value}`;
  const label = t(key);
  return label !== key ? label : value.replace(/_/g, ' ');
}
