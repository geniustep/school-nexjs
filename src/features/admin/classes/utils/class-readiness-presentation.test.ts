import { describe, expect, it } from 'vitest';
import type { ClassReadiness } from '@/types/class';
import { resolveClassReadinessPresentation } from './class-readiness-presentation';

function readiness(
  status: ClassReadiness['status'],
  completed: number,
): ClassReadiness {
  return {
    status,
    completed,
    total: 4,
    items: {
      capacity: { ready: completed >= 1 },
      subjects: { ready: completed >= 2 },
      teaching_assignments: { ready: completed >= 3, missing_count: completed >= 3 ? 0 : 1 },
      timetable: { ready: completed >= 4 },
    },
  };
}

describe('resolveClassReadinessPresentation', () => {
  it('shows a completed class as ready', () => {
    expect(resolveClassReadinessPresentation(readiness('ready', 4), 'ar')).toEqual({
      label: 'جاهز',
      tone: 'green',
    });
  });

  it('shows only the missing setup count for partial readiness', () => {
    expect(resolveClassReadinessPresentation(readiness('partial', 3), 'ar')).toEqual({
      label: 'ينقصه إعداد واحد',
      tone: 'amber',
    });
  });

  it('keeps a not-ready class distinct from occupancy', () => {
    expect(resolveClassReadinessPresentation(readiness('not_ready', 0), 'fr')).toEqual({
      label: '4 réglages manquants',
      tone: 'red',
    });
  });

  it('does not invent readiness when the backend contract is absent', () => {
    expect(resolveClassReadinessPresentation(undefined, 'ar')).toBeNull();
  });
});
