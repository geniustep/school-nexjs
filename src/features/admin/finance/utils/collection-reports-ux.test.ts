import { describe, expect, it } from 'vitest';
import {
  collectionReportsPresetUpdates,
  collectionReportsRangeIsInverted,
  filterCollectionReportClasses,
  filterCollectionReportLevels,
  resolveCollectionReportsDatePreset,
} from '@/features/admin/finance/utils/collection-reports-ux';
import type { Level, SchoolClass } from '@/types/class';

const NOW = new Date(2026, 8, 4, 14, 0, 0);

const levels: Level[] = [
  { id: 1, name: 'Primary 1', cycle: { id: 10, code: 'primary', name: 'Primary' } },
  { id: 2, name: 'Middle 1', cycle: { id: 20, code: 'middle', name: 'Middle' } },
];

const classes: SchoolClass[] = [
  {
    id: 11,
    name: 'A',
    code: 'A',
    level: { id: 1, name: 'Primary 1', cycle: { id: 10, code: 'primary', name: 'Primary' } },
    academic_year: '2026-2027',
    student_count: 0,
    capacity: null,
    teachers: [],
    subjects: [],
    status: 'active',
  },
  {
    id: 22,
    name: 'B',
    code: 'B',
    level: { id: 2, name: 'Middle 1', cycle: { id: 20, code: 'middle', name: 'Middle' } },
    academic_year: '2026-2027',
    student_count: 0,
    capacity: null,
    teachers: [],
    subjects: [],
    status: 'active',
  },
];

describe('collection report operational UX helpers', () => {
  it('builds today, yesterday, week, and month presets without changing the backend contract', () => {
    expect(collectionReportsPresetUpdates('today', NOW)).toEqual({
      dateMode: 'day',
      date: '2026-09-04',
      dateFrom: '',
      dateTo: '',
    });
    expect(collectionReportsPresetUpdates('yesterday', NOW).date).toBe('2026-09-03');
    expect(collectionReportsPresetUpdates('week', NOW)).toEqual({
      dateMode: 'range',
      date: '',
      dateFrom: '2026-08-31',
      dateTo: '2026-09-04',
    });
    expect(collectionReportsPresetUpdates('month', NOW)).toEqual({
      dateMode: 'range',
      date: '',
      dateFrom: '2026-09-01',
      dateTo: '2026-09-04',
    });
  });

  it('resolves matching presets and treats any other range as custom', () => {
    const week = collectionReportsPresetUpdates('week', NOW);
    expect(resolveCollectionReportsDatePreset(week, NOW)).toBe('week');
    expect(
      resolveCollectionReportsDatePreset(
        { dateMode: 'range', date: '', dateFrom: '2026-08-15', dateTo: '2026-08-30' },
        NOW,
      ),
    ).toBe('custom');
  });

  it('detects inverted custom ranges before sending them to the backend', () => {
    expect(collectionReportsRangeIsInverted('2026-09-05', '2026-09-04')).toBe(true);
    expect(collectionReportsRangeIsInverted('2026-09-04', '2026-09-04')).toBe(false);
    expect(collectionReportsRangeIsInverted('', '2026-09-04')).toBe(false);
  });

  it('filters levels and classes hierarchically by cycle then level', () => {
    expect(filterCollectionReportLevels(levels, 'primary').map((level) => level.id)).toEqual([1]);
    expect(
      filterCollectionReportClasses(classes, { cycle: 'middle', levelId: '' }).map(
        (klass) => klass.id,
      ),
    ).toEqual([22]);
    expect(
      filterCollectionReportClasses(classes, { cycle: 'primary', levelId: '1' }).map(
        (klass) => klass.id,
      ),
    ).toEqual([11]);
  });
});
