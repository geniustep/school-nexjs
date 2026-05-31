'use client';

import { useMemo } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import {
  formatDate,
  formatDateShort,
  formatDateTime,
} from '@/lib/i18n/format';

export function useFormat() {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      formatDate: (value: string | null | undefined) => formatDateShort(value, locale),
      formatDateLong: (value: string | null | undefined) => formatDate(value, locale),
      formatDateTime: (value: string | null | undefined) => formatDateTime(value, locale),
    }),
    [locale],
  );
}
