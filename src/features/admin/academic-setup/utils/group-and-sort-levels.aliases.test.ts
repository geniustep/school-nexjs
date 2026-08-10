import { describe, expect, it } from 'vitest';
import type { LevelGroup } from '../types';
import { getFallbackLevelOrder, sortLevels } from './group-and-sort-levels';

const high = { id: 4, code: 'high_school', name: 'الثانوي التأهيلي', sequence: 40 };

function level(
  partial: Partial<LevelGroup> & Pick<LevelGroup, 'id' | 'code' | 'name'>,
): LevelGroup {
  return {
    classes: [],
    studentCount: 0,
    needsReview: 0,
    cycle: high,
    ...partial,
  };
}

describe('Moroccan high-school display aliases', () => {
  it('maps TC, 1BAC and 2BAC to canonical academic order', () => {
    expect(getFallbackLevelOrder('TC')).toBe(130);
    expect(getFallbackLevelOrder('1BAC')).toBe(140);
    expect(getFallbackLevelOrder('2BAC')).toBe(150);
  });

  it('keeps TC before 1BAC and 2BAC even when API sequence is reversed', () => {
    const input = [
      level({ id: 1, code: '1BAC', academic_code: '1BAC', name: 'الأولى بكالوريا', sequence: 10 }),
      level({ id: 2, code: '2BAC', academic_code: '2BAC', name: 'الثانية بكالوريا', sequence: 20 }),
      level({ id: 3, code: 'TC', academic_code: 'TC', name: 'الجذع المشترك', sequence: 30 }),
    ];

    expect(sortLevels(input).map((item) => item.code)).toEqual(['TC', '1BAC', '2BAC']);
  });
});
