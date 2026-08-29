import { describe, expect, it } from 'vitest';
import type { DistributionSelectionItem } from '@/types/class-distribution';
import { directMoveItems, directTargetSelectValue } from './direct-move';

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
});
