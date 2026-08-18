import type { ExecutiveTone } from '@/features/admin/dashboard/executive-dashboard-ui';
import type { AdminExecutiveDashboard } from '@/types/executive-dashboard';
import type { AdminDashboard } from '@/types/dashboard';
import type { Locale } from '@/lib/i18n/config';
import { attendancePercent } from '@/features/admin/dashboard/dashboard-interventions';
import { currencyCode } from '@/lib/utils/finance';

const DEFAULT_FINANCE_CURRENCY = 'MAD';

export type ExecutiveAttendanceKpiState = 'unavailable' | 'partial' | 'zero' | 'valid';

export type ExecutiveAttendanceKpi = {
  state: ExecutiveAttendanceKpiState;
  displayValue: string;
  rate: number | null;
  tone: ExecutiveTone;
};

function financeCurrencySymbol(code: string, locale: Locale): string {
  if (code === 'MAD') {
    if (locale === 'ar') return 'د.م.';
    return 'MAD';
  }
  return code;
}

function formatKpiAmountDigits(amount: number, locale: Locale, fractionDigits: number): string {
  if (locale === 'ar' || locale === 'fr') {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
      .format(amount)
      .replace(/\u202f/g, ' ');
  }
  const bcp47 = locale === 'es' ? 'es-ES' : 'en-US';
  return new Intl.NumberFormat(bcp47, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

function hasMeaningfulFraction(amount: number): boolean {
  return Math.abs(amount - Math.round(amount)) > 1e-9;
}

export function formatExecutiveKpiMoneyParts(
  amount: number | null | undefined,
  currency: unknown,
  locale: Locale,
): { amount: string; currency: string } | null {
  if (amount == null || Number.isNaN(amount)) return null;
  const code = currencyCode(currency) ?? DEFAULT_FINANCE_CURRENCY;
  const fractionDigits = hasMeaningfulFraction(amount) ? 2 : 0;
  return {
    amount: formatKpiAmountDigits(amount, locale, fractionDigits),
    currency: financeCurrencySymbol(code, locale),
  };
}

export function formatExecutiveKpiMoney(
  amount: number | null | undefined,
  currency: unknown,
  locale: Locale,
): string {
  const parts = formatExecutiveKpiMoneyParts(amount, currency, locale);
  if (!parts) return '—';
  return `${parts.amount} ${parts.currency}`;
}

export function resolveAttendanceTone(rate: number | null): ExecutiveTone {
  if (rate == null) return 'neutral';
  if (rate >= 90) return 'green';
  if (rate >= 75) return 'amber';
  return 'red';
}

function normalizeAttendanceRate(rate: number): number {
  if (rate > 0 && rate <= 1) return rate * 100;
  return rate;
}

export function resolveLegacyAttendanceKpi(
  att: AdminDashboard['attendance_today'],
): ExecutiveAttendanceKpi {
  const totalRecorded = att?.total_recorded ?? att?.total ?? 0;
  const pct = attendancePercent(att);

  if (totalRecorded <= 0) {
    return { state: 'unavailable', displayValue: '—', rate: null, tone: 'neutral' };
  }

  if (pct === 0) {
    return { state: 'zero', displayValue: '0%', rate: 0, tone: 'red' };
  }

  return {
    state: 'valid',
    displayValue: `${Math.round(pct!)}%`,
    rate: pct,
    tone: resolveAttendanceTone(pct),
  };
}

export function resolveExecutiveAttendanceKpi(
  gaps: AdminExecutiveDashboard['attendance_gaps'] | null | undefined,
): ExecutiveAttendanceKpi {
  if (!gaps) {
    return { state: 'unavailable', displayValue: '—', rate: null, tone: 'neutral' };
  }

  const rawRate = gaps.attendance_rate_today;
  const absent = gaps.absent_today_count ?? 0;
  const late = gaps.late_today_count ?? 0;
  const missingClasses = gaps.classes_without_attendance_count ?? 0;
  const hasActivityEvidence = absent > 0 || late > 0;
  const hasValidRate = Number.isFinite(rawRate);
  const rate = hasValidRate ? normalizeAttendanceRate(rawRate!) : null;

  // A school-wide attendance rate is not trustworthy while any class is still
  // missing attendance. Treat the signal as partial even if the backend also
  // returns a provisional rate or zero absent/late counts.
  if (missingClasses > 0) {
    return { state: 'partial', displayValue: '—', rate: null, tone: 'amber' };
  }

  if (!hasValidRate && hasActivityEvidence) {
    return { state: 'partial', displayValue: '—', rate: null, tone: 'amber' };
  }

  if ((rate == null || rate === 0) && !hasActivityEvidence) {
    return { state: 'unavailable', displayValue: '—', rate: null, tone: 'neutral' };
  }

  if (rate === 0 && hasActivityEvidence) {
    return { state: 'zero', displayValue: '0%', rate: 0, tone: 'red' };
  }

  if (rate != null && rate > 0) {
    return {
      state: 'valid',
      displayValue: `${Math.round(rate)}%`,
      rate,
      tone: resolveAttendanceTone(rate),
    };
  }

  return { state: 'unavailable', displayValue: '—', rate: null, tone: 'neutral' };
}
