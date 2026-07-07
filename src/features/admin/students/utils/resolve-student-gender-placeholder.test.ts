import { describe, expect, it } from 'vitest';
import {
  resolveStudentGenderPlaceholder,
  STUDENT_PHOTO_PLACEHOLDER_PATHS,
} from './resolve-student-gender-placeholder';

describe('resolveStudentGenderPlaceholder', () => {
  it('maps male to boy placeholder', () => {
    expect(resolveStudentGenderPlaceholder('male')).toBe(STUDENT_PHOTO_PLACEHOLDER_PATHS.male);
  });

  it('maps female to girl placeholder', () => {
    expect(resolveStudentGenderPlaceholder('female')).toBe(STUDENT_PHOTO_PLACEHOLDER_PATHS.female);
  });

  it('maps missing gender to neutral placeholder', () => {
    expect(resolveStudentGenderPlaceholder(null)).toBe(STUDENT_PHOTO_PLACEHOLDER_PATHS.neutral);
    expect(resolveStudentGenderPlaceholder(undefined)).toBe(STUDENT_PHOTO_PLACEHOLDER_PATHS.neutral);
  });

  it('maps unknown gender values to neutral placeholder', () => {
    expect(resolveStudentGenderPlaceholder('other')).toBe(STUDENT_PHOTO_PLACEHOLDER_PATHS.neutral);
    expect(resolveStudentGenderPlaceholder('')).toBe(STUDENT_PHOTO_PLACEHOLDER_PATHS.neutral);
  });
});
