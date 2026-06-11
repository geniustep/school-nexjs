import { describe, expect, it } from 'vitest';
import {
  formatUsageLines,
  levelHasOperationalUsage,
  mergeUsageFromError,
  primaryLinkedItemsRoute,
  usageFromErrorDetails,
} from './level-usage';

describe('level-usage utils', () => {
  it('hides zero usage lines', () => {
    const lines = formatUsageLines(
      {
        classes: 1,
        subjects: 0,
        tracks: 0,
        students: 0,
        enrollments: 0,
        assignments: 0,
        timetable_slots: 0,
        exams: 0,
      },
      (key, vars) => `${key}:${vars?.count ?? ''}`,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.key).toBe('classes');
  });

  it('parses error details usage', () => {
    const usage = usageFromErrorDetails({
      classes: 3,
      subjects: 8,
      students: 62,
      assignments: 14,
    });
    expect(usage?.classes).toBe(3);
    expect(usage?.subjects).toBe(8);
    expect(levelHasOperationalUsage(usage!)).toBe(true);
  });

  it('prefers error details over level counts', () => {
    const usage = mergeUsageFromError(
      { id: 1, name: 'L', classes_count: 0 },
      { code: 'level_in_use', message: 'in use', details: { classes: 2 } },
    );
    expect(usage.classes).toBe(2);
  });

  it('maps linked items route by priority', () => {
    expect(
      primaryLinkedItemsRoute(5, {
        classes: 1,
        subjects: 0,
        tracks: 0,
        students: 0,
        enrollments: 0,
        assignments: 0,
        timetable_slots: 0,
        exams: 0,
      }),
    ).toContain('classes?level=5');
    expect(
      primaryLinkedItemsRoute(5, {
        classes: 0,
        subjects: 2,
        tracks: 0,
        students: 0,
        enrollments: 0,
        assignments: 0,
        timetable_slots: 0,
        exams: 0,
      }),
    ).toContain('subjects?level=5');
  });
});
