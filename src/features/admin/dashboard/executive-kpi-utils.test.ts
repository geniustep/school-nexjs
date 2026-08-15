import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n/messages';
import {
  formatExecutiveKpiMoney,
  resolveAttendanceTone,
  resolveExecutiveAttendanceKpi,
  resolveLegacyAttendanceKpi,
} from '@/features/admin/dashboard/executive-kpi-utils';

describe('executive attendance KPI semantics', () => {
  it('Case A — no attendance records does not show 0%', () => {
    const legacy = resolveLegacyAttendanceKpi({
      present: 0,
      absent: 0,
      late: 0,
      left_early: 0,
      total: 0,
    });
    expect(legacy.displayValue).toBe('—');
    expect(legacy.state).toBe('unavailable');
    expect(legacy.tone).toBe('neutral');

    const executive = resolveExecutiveAttendanceKpi({
      classes_without_attendance_count: 0,
      absent_today_count: 0,
      late_today_count: 0,
      attendance_rate_today: 0,
    });
    expect(executive.displayValue).toBe('—');
    expect(executive.state).toBe('unavailable');
  });

  it('Case B — records exist with attendance_rate_today = 0 shows 0%', () => {
    const executive = resolveExecutiveAttendanceKpi({
      classes_without_attendance_count: 0,
      absent_today_count: 3,
      late_today_count: 0,
      attendance_rate_today: 0,
    });
    expect(executive.displayValue).toBe('0%');
    expect(executive.state).toBe('zero');
    expect(executive.tone).toBe('red');

    const legacy = resolveLegacyAttendanceKpi({
      present: 0,
      absent: 5,
      late: 0,
      left_early: 0,
      total: 5,
    });
    expect(legacy.displayValue).toBe('0%');
    expect(legacy.state).toBe('zero');
  });

  it('Case C — valid percentage displays correctly with tone', () => {
    const executive = resolveExecutiveAttendanceKpi({
      classes_without_attendance_count: 0,
      absent_today_count: 2,
      late_today_count: 1,
      attendance_rate_today: 91.2,
    });
    expect(executive.displayValue).toBe('91%');
    expect(executive.state).toBe('valid');
    expect(executive.tone).toBe('green');
    expect(resolveAttendanceTone(80)).toBe('amber');
    expect(resolveAttendanceTone(70)).toBe('red');
  });

  it('Case D — missing classes force a partial state even when a provisional rate exists', () => {
    const zeroCounts = resolveExecutiveAttendanceKpi({
      classes_without_attendance_count: 24,
      absent_today_count: 0,
      late_today_count: 0,
      attendance_rate_today: 0,
    });
    expect(zeroCounts.displayValue).toBe('—');
    expect(zeroCounts.state).toBe('partial');
    expect(zeroCounts.rate).toBeNull();
    expect(zeroCounts.tone).toBe('amber');

    const provisionalRate = resolveExecutiveAttendanceKpi({
      classes_without_attendance_count: 3,
      absent_today_count: 1,
      late_today_count: 2,
      attendance_rate_today: 93.4,
    });
    expect(provisionalRate.displayValue).toBe('—');
    expect(provisionalRate.state).toBe('partial');
    expect(provisionalRate.rate).toBeNull();
    expect(provisionalRate.tone).toBe('amber');
  });

  it('normalizes fractional attendance rates and assigns partial amber tone', () => {
    const fractional = resolveExecutiveAttendanceKpi({
      classes_without_attendance_count: 0,
      absent_today_count: 0,
      late_today_count: 0,
      attendance_rate_today: 0.885,
    });
    expect(fractional.displayValue).toBe('89%');
    expect(fractional.tone).toBe('amber');

    const partial = resolveExecutiveAttendanceKpi({
      classes_without_attendance_count: 0,
      absent_today_count: 4,
      late_today_count: 1,
      attendance_rate_today: NaN,
    });
    expect(partial.state).toBe('partial');
    expect(partial.tone).toBe('amber');
  });
});

describe('intervention KPI label', () => {
  it('uses action-required wording instead of critical severity label', () => {
    expect(translate('ar', 'admin.executive.kpiIntervention')).toBe('تحتاج تدخلًا');
    expect(translate('ar', 'admin.executive.kpiIntervention')).not.toContain('حرجة');
    expect(translate('en', 'admin.executive.kpiIntervention')).toBe('Needs intervention');
  });
});

describe('executive KPI money formatting', () => {
  it('Case A — 2500.00 formats without unnecessary decimals in ar', () => {
    expect(formatExecutiveKpiMoney(2500, 'MAD', 'ar')).toBe('2 500 د.م.');
  });

  it('Case B — 56700.00 formats compactly in ar', () => {
    expect(formatExecutiveKpiMoney(56700, 'MAD', 'ar')).toBe('56 700 د.م.');
  });

  it('Case C — fractional amounts keep real decimals', () => {
    expect(formatExecutiveKpiMoney(56700.5, 'MAD', 'ar')).toBe('56 700,50 د.م.');
    expect(formatExecutiveKpiMoney(2500.25, 'MAD', 'en')).toBe('2,500.25 MAD');
  });
});
