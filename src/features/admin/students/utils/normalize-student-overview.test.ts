import { describe, expect, it } from 'vitest';
import { normalizeStudentOverviewResponse } from './normalize-student-overview';

describe('normalizeStudentOverviewResponse', () => {
  it('tolerates partial payloads', () => {
    const result = normalizeStudentOverviewResponse({
      available: true,
      alerts: [{ severity: 'warning', title: 'Test alert' }],
      family: { has_guardian: false },
    });
    expect(result?.alerts).toHaveLength(1);
    expect(result?.family?.has_guardian).toBe(false);
  });

  it('respects available:false sections', () => {
    const result = normalizeStudentOverviewResponse({
      available: false,
      finance_summary: { available: false, total_overdue: 99 },
    });
    expect(result?.available).toBe(false);
    expect(result?.finance_summary?.available).toBe(false);
  });

  it('does not include excused_absence in attendance', () => {
    const result = normalizeStudentOverviewResponse({
      attendance_summary: {
        absences_this_month: 2,
        late_this_month: 1,
        excused_absence: 5,
        last_status: 'present',
      },
    });
    expect(result?.attendance_summary).toEqual({
      available: true,
      absences_this_month: 2,
      late_this_month: 1,
      last_status: 'present',
      last_status_label: null,
      last_status_date: null,
    });
  });

  it('hides consent details when can_view is false', () => {
    const result = normalizeStudentOverviewResponse({
      consents_summary: {
        can_view: false,
        photo_publish: 'granted',
      },
    });
    expect(result?.consents_summary?.can_view).toBe(false);
    expect(result?.consents_summary?.photo_publish).toBe('granted');
  });
});
