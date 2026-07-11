import { describe, expect, it } from 'vitest';
import {
  formatScoreDisplay,
  parseScoreInput,
} from './gradebook-score-validation';

describe('gradebook-score-validation', () => {
  it('accepts score zero', () => {
    const parsed = parseScoreInput('0', 10);
    expect(parsed).toEqual({ valid: true, score: 0, scoreIsSet: true });
    expect(formatScoreDisplay(0, true, 'taken')).toBe('0');
  });

  it('rejects negative and over-max values', () => {
    expect(parseScoreInput('-1', 10)).toEqual({ valid: false, reason: 'negative' });
    expect(parseScoreInput('11', 10)).toEqual({ valid: false, reason: 'over_max' });
    expect(parseScoreInput('abc', 10)).toEqual({ valid: false, reason: 'invalid' });
  });

  it('treats empty input as not entered', () => {
    expect(parseScoreInput('', 10)).toEqual({ valid: false, reason: 'empty' });
  });
});
