import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCreateSchoolSubjectPayload,
  collectLevelSubjectIds,
  listLocalSubjectsAvailableForLevel,
} from './create-school-subject';
import type { Level, Subject } from '@/types/class';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function subject(partial: Partial<Subject> & Pick<Subject, 'id' | 'name'>): Subject {
  return {
    code: null,
    ref_subject_id: null,
    level_ids: [],
    active: true,
    ...partial,
  };
}

describe('buildCreateSchoolSubjectPayload', () => {
  it('builds a tenant-local create payload with levels, weekly hours and coefficient', () => {
    expect(
      buildCreateSchoolSubjectPayload({
        name: '  نشاط حر  ',
        code: ' ACT_1 ',
        levelIds: [77, 77, 2442],
        weeklyHours: 2,
        coefficient: 1.5,
        enableImmediately: true,
      }),
    ).toEqual({
      name: 'نشاط حر',
      code: 'ACT_1',
      sequence: 10,
      category: 'other',
      credit_hours: 1,
      level_ids: [77, 2442],
      weekly_hours: 2,
      assessment_coefficient: 1.5,
      legacy_coefficient: 1.5,
      coefficient: 1.5,
      enable_immediately: true,
    });
  });

  it('omits empty code and null weekly hours', () => {
    expect(
      buildCreateSchoolSubjectPayload({
        name: 'مادة',
        code: '  ',
        levelIds: [1],
        weeklyHours: null,
        enableImmediately: false,
      }),
    ).toEqual({
      name: 'مادة',
      sequence: 10,
      category: 'other',
      credit_hours: 1,
      level_ids: [1],
      enable_immediately: false,
    });
  });
});

describe('collectLevelSubjectIds', () => {
  it('reads ids from level.subjects', () => {
    const level = {
      id: 77,
      name: 'P1',
      subjects: [subject({ id: 1, name: 'A' }), subject({ id: 2, name: 'B' })],
    } as Level;
    expect(collectLevelSubjectIds(level)).toEqual([1, 2]);
  });
});

describe('listLocalSubjectsAvailableForLevel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps only inactive-reference-free subjects not yet on the level', () => {
    const rows = listLocalSubjectsAvailableForLevel(
      [
        subject({ id: 1, name: 'محلية', ref_subject_id: null }),
        subject({ id: 2, name: 'مرجعية', ref_subject_id: 9 }),
        subject({ id: 3, name: 'مفعّلة', ref_subject_id: null, level_ids: [77] }),
        subject({ id: 4, name: 'مفعّلة تشغيلياً', ref_subject_id: null }),
        subject({ id: 5, name: 'مؤرشفة', ref_subject_id: null, active: false }),
      ],
      77,
      [4],
    );
    expect(rows.map((r) => r.id)).toEqual([1]);
  });
});
