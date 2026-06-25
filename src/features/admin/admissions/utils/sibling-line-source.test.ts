import { describe, expect, it } from 'vitest';
import {
  resolveSiblingLineSource,
  siblingLineLinkedStudentId,
} from './sibling-display';
import type { SiblingLine } from '@/types/sibling-line';

describe('resolveSiblingLineSource', () => {
  it('classifies a line with a positive linked_student_id as linked', () => {
    const line = { name: 'Sara', linked_student_id: 1551 } as SiblingLine;
    expect(resolveSiblingLineSource(line)).toBe('linked');
    expect(siblingLineLinkedStudentId(line)).toBe(1551);
  });

  it('classifies a line without linked_student_id as admission', () => {
    const line = { name: 'مرحبتين', relationship: 'brother' } as SiblingLine;
    expect(resolveSiblingLineSource(line)).toBe('admission');
    expect(siblingLineLinkedStudentId(line)).toBeNull();
  });

  it('treats a falsy/zero/negative linked_student_id as admission (no fake link)', () => {
    expect(resolveSiblingLineSource({ linked_student_id: 0 } as SiblingLine)).toBe('admission');
    expect(resolveSiblingLineSource({ linked_student_id: -3 } as SiblingLine)).toBe('admission');
    expect(
      resolveSiblingLineSource({ linked_student_id: false as unknown as number } as SiblingLine),
    ).toBe('admission');
    expect(siblingLineLinkedStudentId({ linked_student_id: 0 } as SiblingLine)).toBeNull();
  });
});
