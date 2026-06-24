import { describe, expect, it } from 'vitest';
import {
  MASSAR_CODE_PATTERN,
  normalizeMassarCodeInput,
  shouldCheckMassarCodeDuplicate,
} from './massar-code';

describe('normalizeMassarCodeInput', () => {
  it('returns empty for blank input', () => {
    expect(normalizeMassarCodeInput('')).toBe('');
    expect(normalizeMassarCodeInput('   ')).toBe('');
  });

  it('uppercases lowercase input', () => {
    expect(normalizeMassarCodeInput('g412252321')).toBe('G412252321');
  });

  it('removes internal spaces and dashes', () => {
    expect(normalizeMassarCodeInput('G 412-252-321')).toBe('G412252321');
  });

  it('extracts local part before @taalim.ma', () => {
    expect(normalizeMassarCodeInput('G412252321@taalim.ma')).toBe('G412252321');
    expect(normalizeMassarCodeInput('g412252321@TAALIM.MA')).toBe('G412252321');
  });

  it('accepts valid examples', () => {
    expect(MASSAR_CODE_PATTERN.test(normalizeMassarCodeInput('G412252321'))).toBe(true);
    expect(MASSAR_CODE_PATTERN.test(normalizeMassarCodeInput('M123456789'))).toBe(true);
  });

  it('rejects invalid examples after normalization', () => {
    expect(MASSAR_CODE_PATTERN.test(normalizeMassarCodeInput('412252321'))).toBe(false);
    expect(MASSAR_CODE_PATTERN.test(normalizeMassarCodeInput('GG412252321'))).toBe(false);
    expect(MASSAR_CODE_PATTERN.test(normalizeMassarCodeInput('G41225'))).toBe(false);
    expect(MASSAR_CODE_PATTERN.test(normalizeMassarCodeInput('G4122523210'))).toBe(false);
  });
});

describe('shouldCheckMassarCodeDuplicate', () => {
  it('skips duplicate check for empty or invalid values', () => {
    expect(shouldCheckMassarCodeDuplicate('')).toBe(false);
    expect(shouldCheckMassarCodeDuplicate('G41225')).toBe(false);
  });

  it('runs duplicate check for valid normalized values', () => {
    expect(shouldCheckMassarCodeDuplicate('g412252321')).toBe(true);
  });
});
