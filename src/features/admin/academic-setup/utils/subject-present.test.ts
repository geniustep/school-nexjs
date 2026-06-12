import { describe, expect, it } from 'vitest';
import { dedupeSubjectsForDisplay } from './subject-present';
import type { Subject } from '@/types/class';

function subject(id: number, name: string): Subject {
  return { id, name };
}

describe('dedupeSubjectsForDisplay', () => {
  it('removes duplicate subjects by id', () => {
    const result = dedupeSubjectsForDisplay([
      subject(1, 'اللغة العربية'),
      subject(1, 'اللغة العربية'),
      subject(2, 'الرياضيات'),
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual([1, 2]);
  });

  it('preserves first occurrence order', () => {
    const result = dedupeSubjectsForDisplay([
      subject(3, 'C'),
      subject(1, 'A'),
      subject(3, 'C duplicate'),
    ]);
    expect(result.map((s) => s.id)).toEqual([3, 1]);
  });
});
