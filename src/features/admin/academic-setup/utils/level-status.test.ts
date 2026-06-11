import { describe, expect, it } from 'vitest';
import {
  classStatusLabel,
  computeLevelStatus,
  LEVEL_STATUS_TONE,
} from './level-status';
import type { LevelGroup } from '../types';

const t = (key: string) => `tr:${key}`;

function group(partial: Partial<LevelGroup>): LevelGroup {
  return {
    id: 1,
    name: 'Level',
    classes: [],
    studentCount: 0,
    needsReview: 0,
    ...partial,
  };
}

describe('computeLevelStatus', () => {
  it('returns needs_classes when empty', () => {
    expect(computeLevelStatus(group({}), 0)).toBe('needs_classes');
  });

  it('returns needs_review when classes lack subjects', () => {
    expect(
      computeLevelStatus(
        group({
          classes: [{ id: 1, name: 'A', status: 'active' } as LevelGroup['classes'][0]],
          needsReview: 1,
        }),
        2,
      ),
    ).toBe('needs_review');
  });

  it('returns needs_subjects when no subjects on level', () => {
    expect(
      computeLevelStatus(
        group({
          classes: [{ id: 1, name: 'A', status: 'active', subjects: [{ id: 1, name: 'Math' }] } as LevelGroup['classes'][0]],
        }),
        0,
      ),
    ).toBe('needs_subjects');
  });

  it('returns complete when healthy', () => {
    expect(
      computeLevelStatus(
        group({
          classes: [{ id: 1, name: 'A', status: 'active', subjects: [{ id: 1, name: 'Math' }] } as LevelGroup['classes'][0]],
        }),
        3,
      ),
    ).toBe('complete');
  });
});

describe('classStatusLabel', () => {
  it('uses academic setup class status keys', () => {
    expect(classStatusLabel('active', t)).toBe('tr:admin.academicSetup.classStatus.active');
  });

  it('falls back to raw status when no translation exists', () => {
    const missingT = (key: string) => key;
    expect(classStatusLabel('draft', missingT)).toBe('draft');
  });
});

describe('LEVEL_STATUS_TONE', () => {
  it('maps every status to a tone', () => {
    const keys = ['active', 'needs_classes', 'needs_subjects', 'needs_review', 'complete'] as const;
    for (const key of keys) {
      expect(LEVEL_STATUS_TONE[key]).toBeTruthy();
    }
  });
});
