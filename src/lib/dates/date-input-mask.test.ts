import { describe, expect, it } from 'vitest';
import {
  applyDateBackspaceInput,
  applyDateDigitInput,
  applyDateMaskInput,
  constrainDateDigits,
  displayDateToIso,
  extractDateDigits,
  isoToMaskedDisplay,
} from './date-input-mask';

describe('date-input-mask', () => {
  it('extracts digits only', () => {
    expect(extractDateDigits("24'34abc")).toBe('2434');
    expect(applyDateMaskInput("24'34abc")).toBe('24/');
  });

  it('limits day to 31 and month to 12', () => {
    expect(constrainDateDigits('31072026')).toBe('31072026');
    expect(constrainDateDigits('01121234')).toBe('01121234');
    expect(constrainDateDigits('0113')).toBe('011');
    expect(constrainDateDigits('32151234')).toBe('311234');
    expect(constrainDateDigits('32')).toBe('3');
  });

  it('formats dd/mm/yyyy progressively', () => {
    expect(applyDateMaskInput('1')).toBe('1');
    expect(applyDateMaskInput('15')).toBe('15/');
    expect(applyDateMaskInput('1507')).toBe('15/07/');
    expect(applyDateMaskInput('15072026')).toBe('15/07/2026');
  });

  it('limits year to 4 digits', () => {
    expect(applyDateMaskInput('150720261234')).toBe('15/07/2026');
  });

  it('auto-advances from day to month and month to year', () => {
    expect(applyDateDigitInput('', 0, 0, '1')).toEqual({ value: '1', caret: 1 });
    expect(applyDateDigitInput('1', 1, 1, '5')).toEqual({ value: '15/', caret: 3 });
    expect(applyDateDigitInput('', 0, 0, '7')).toEqual({ value: '07/', caret: 3 });
    expect(applyDateDigitInput('15/', 3, 3, '0')).toEqual({ value: '15/0', caret: 4 });
    expect(applyDateDigitInput('15/0', 4, 4, '7')).toEqual({ value: '15/07/', caret: 6 });
    expect(applyDateDigitInput('15/', 3, 3, '9')).toEqual({ value: '15/09/', caret: 6 });
  });

  it('handles backspace across segments', () => {
    expect(applyDateBackspaceInput('15/07/', 6, 6)).toEqual({ value: '15/07', caret: 5 });
    expect(applyDateBackspaceInput('15/', 3, 3)).toEqual({ value: '15', caret: 2 });
  });

  it('converts complete masked dates to ISO', () => {
    expect(displayDateToIso('15/07/2026')).toBe('2026-07-15');
    expect(displayDateToIso('31/02/2026')).toBeNull();
    expect(displayDateToIso('15/07/202')).toBeNull();
    expect(isoToMaskedDisplay('2026-07-15')).toBe('15/07/2026');
  });
});
