import { describe, expect, it } from 'vitest';
import {
  buildStudentsFinancialServiceCountsParams,
  normalizeFinancialServiceCountsData,
  normalizeFinancialServiceCountItem,
  readTotalStudentsFromMeta,
  sliceVisibleServiceCounts,
  STUDENTS_SERVICE_COUNTS_INITIAL_VISIBLE,
} from './students-financial-service-counts';

describe('buildStudentsFinancialServiceCountsParams', () => {
  it('maps statusFilter to state and omits unsupported params', () => {
    expect(
      buildStudentsFinancialServiceCountsParams({
        statusFilter: 'active',
        levelId: '12',
        classId: '88',
      }),
    ).toEqual({
      state: 'active',
      level_id: '12',
      class_id: '88',
    });
  });

  it('omits empty academic filters', () => {
    expect(
      buildStudentsFinancialServiceCountsParams({
        statusFilter: '',
        levelId: '',
        classId: '',
      }),
    ).toEqual({
      state: undefined,
      level_id: undefined,
      class_id: undefined,
    });
  });
});

describe('normalizeFinancialServiceCountsData', () => {
  it('preserves Backend item order without client-side filtering', () => {
    const data = normalizeFinancialServiceCountsData({
      items: [
        { service_id: 2, name: 'كتب', sequence: 20, student_count: 3 },
        { service_id: 1310, name: 'النقل', code: 'TRANSPORT', sequence: 10, student_count: 44 },
        { service_id: 3, name: 'مطعم', sequence: 10, student_count: 0, active: true },
      ],
    });
    expect(data.items.map((i) => i.service_id)).toEqual([2, 1310, 3]);
    expect(data.items[1]).toMatchObject({
      service_id: 1310,
      name: 'النقل',
      code: 'TRANSPORT',
      student_count: 44,
    });
    expect(data.items[2].student_count).toBe(0);
  });

  it('drops invalid rows', () => {
    expect(normalizeFinancialServiceCountItem({ name: 'x' })).toBeNull();
    expect(normalizeFinancialServiceCountsData(null).items).toEqual([]);
  });
});

describe('readTotalStudentsFromMeta', () => {
  it('reads total_students', () => {
    expect(readTotalStudentsFromMeta({ total_students: 123 })).toBe(123);
    expect(readTotalStudentsFromMeta({})).toBe(0);
  });
});

describe('sliceVisibleServiceCounts', () => {
  const items = Array.from({ length: 14 }, (_, i) => ({
    service_id: i + 1,
    name: `S${i}`,
    code: null,
    active: true,
    sequence: i,
    student_count: i,
  }));

  it('limits to initial visible when collapsed', () => {
    expect(sliceVisibleServiceCounts(items, false)).toHaveLength(
      STUDENTS_SERVICE_COUNTS_INITIAL_VISIBLE,
    );
  });

  it('returns all when item count is within initial visible', () => {
    expect(sliceVisibleServiceCounts(items.slice(0, 10), false)).toHaveLength(10);
  });

  it('returns all when expanded', () => {
    expect(sliceVisibleServiceCounts(items, true)).toHaveLength(14);
  });
});
