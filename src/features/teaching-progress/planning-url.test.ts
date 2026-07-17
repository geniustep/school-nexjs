import { describe, expect, it } from 'vitest';
import {
  buildTeacherPlanningHref,
  parseTeacherPlanningQuery,
} from '@/features/teaching-progress/planning-url';

describe('teacher planning URL helpers', () => {
  it('builds and parses class/offering context', () => {
    const href = buildTeacherPlanningHref({
      classId: 10,
      offeringId: 20,
      academicYearId: 3,
      returnTo: '/teacher/sessions/9?tab=progress',
    });
    expect(href).toContain('class_id=10');
    expect(href).toContain('offering_id=20');
    expect(href).toContain('academic_year_id=3');
    expect(href).toContain('return_to=%2Fteacher%2Fsessions%2F9');

    const parsed = parseTeacherPlanningQuery(new URLSearchParams(href.split('?')[1]));
    expect(parsed.classId).toBe('10');
    expect(parsed.offeringId).toBe('20');
    expect(parsed.academicYearId).toBe('3');
    expect(parsed.returnTo).toBe('/teacher/sessions/9?tab=progress');
  });

  it('ignores invalid and open-redirect return_to values', () => {
    expect(buildTeacherPlanningHref({ classId: 'abc', offeringId: -1 })).toBe(
      '/teacher/teaching/planning',
    );
    const parsed = parseTeacherPlanningQuery(
      new URLSearchParams('class_id=0&offering_id=x&return_to=https://evil.example'),
    );
    expect(parsed.classId).toBe('');
    expect(parsed.offeringId).toBe('');
    expect(parsed.returnTo).toBeNull();
  });
});
