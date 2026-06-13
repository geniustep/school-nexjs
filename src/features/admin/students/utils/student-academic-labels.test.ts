import { describe, expect, it } from 'vitest';
import { studentClassLabel, studentLevelLabel } from './student-academic-labels';

describe('student academic labels', () => {
  it('prefers display_alias for level', () => {
    expect(
      studentLevelLabel({
        id: 1,
        name: 'M1',
        code: 'M1',
        display_alias: 'M1 — السنة الأولى إعدادي',
      }),
    ).toBe('M1 — السنة الأولى إعدادي');
  });

  it('prefers display_name for class', () => {
    expect(
      studentClassLabel({
        id: 2,
        name: 'M1A',
        code: 'M1A',
        display_name: 'M1A — السنة الأولى إعدادي، القسم A',
      }),
    ).toBe('M1A — السنة الأولى إعدادي، القسم A');
  });

  it('falls back to code', () => {
    expect(studentLevelLabel({ id: 1, name: '', code: 'P1' })).toBe('P1');
  });
});
