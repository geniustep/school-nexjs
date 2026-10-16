import { describe, expect, it } from 'vitest';
import { keepTeacherWhenDatesChange } from './assignment-date-recheck';

describe('keepTeacherWhenDatesChange', () => {
  it('keeps ordinary teacher selection and requires a recheck', () => {
    expect(keepTeacherWhenDatesChange({ teacherId: 10, override: false, overrideReason: '' }))
      .toEqual({ teacherId: 10, override: false, overrideReason: '' });
  });
  it('never retains a prior override or its justification', () => {
    expect(keepTeacherWhenDatesChange({ teacherId: 10, override: true, overrideReason: 'reason' }))
      .toEqual({ teacherId: null, override: false, overrideReason: '' });
  });
});
