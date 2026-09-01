import { describe, expect, it } from 'vitest';
import type {
  ClassDistributionMoveRequest,
  DistributionSelectionItem,
} from '@/types/class-distribution';
import {
  applyRequestFromPreview,
  directMoveItems,
  directTargetSelectValue,
} from './direct-move';

const a: DistributionSelectionItem = {
  studentId: 1,
  enrollmentId: 11,
  sourceClassId: 101,
  name: 'سلمى العلوي',
  code: 'S-001',
  gender: 'female',
};

const b: DistributionSelectionItem = {
  studentId: 2,
  enrollmentId: 12,
  sourceClassId: 101,
  name: 'ياسين أمين',
  code: 'S-002',
  gender: 'male',
};

const c: DistributionSelectionItem = {
  studentId: 3,
  enrollmentId: null,
  sourceClassId: null,
  name: 'مريم الإدريسي',
  code: 'S-003',
  gender: 'female',
};

describe('direct class-distribution move helpers', () => {
  it('drags the whole current selection when the dragged student is selected', () => {
    expect(directMoveItems([a, b], b)).toEqual([a, b]);
  });

  it('drags only the grabbed student when it is outside the current selection', () => {
    expect(directMoveItems([a, b], c)).toEqual([c]);
  });

  it('maps the mobile direct-target selector without an extra preview button', () => {
    expect(directTargetSelectValue('unassigned')).toBeNull();
    expect(directTargetSelectValue('203')).toBe(203);
    expect(directTargetSelectValue('')).toBeUndefined();
    expect(directTargetSelectValue('x')).toBeUndefined();
  });

  it('promotes the validated preview intent to apply without changing its moves', () => {
    const preview: ClassDistributionMoveRequest = {
      academic_year_id: 1,
      level_id: 77,
      mode: 'preview',
      moves: [
        {
          student_id: 2131,
          from_class_id: 2053,
          to_class_id: 4351,
        },
      ],
    };

    const apply = applyRequestFromPreview(preview);

    expect(apply).toEqual({ ...preview, mode: 'apply' });
    expect(apply.moves).not.toBe(preview.moves);
    expect(apply.moves[0]).not.toBe(preview.moves[0]);
  });

  it('keeps unassigned-to-class apply source null after preview', () => {
    const preview: ClassDistributionMoveRequest = {
      academic_year_id: 1,
      level_id: 77,
      mode: 'preview',
      moves: [
        {
          student_id: 11550,
          from_class_id: null,
          to_class_id: 4351,
        },
      ],
    };

    expect(applyRequestFromPreview(preview)).toMatchObject({
      mode: 'apply',
      moves: [{ student_id: 11550, from_class_id: null, to_class_id: 4351 }],
    });
  });
});
