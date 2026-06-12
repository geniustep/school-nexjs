import { describe, expect, it } from 'vitest';
import {
  levelCtaI18nKey,
  levelPrimaryCtaKey,
  shouldShowDuplicateLevelCtas,
} from './level-card-present';

describe('levelPrimaryCtaKey', () => {
  it('returns createFirstClass when no classes', () => {
    expect(levelPrimaryCtaKey(0)).toBe('createFirstClass');
  });

  it('returns addClasses when classes exist', () => {
    expect(levelPrimaryCtaKey(1)).toBe('addClasses');
    expect(levelPrimaryCtaKey(5)).toBe('addClasses');
  });

  it('maps to i18n keys', () => {
    expect(levelCtaI18nKey(0)).toBe('admin.academicSetup.createFirstClass');
    expect(levelCtaI18nKey(2)).toBe('admin.academicSetup.addClasses');
  });

  it('never shows duplicate CTAs', () => {
    expect(shouldShowDuplicateLevelCtas(0)).toBe(false);
    expect(shouldShowDuplicateLevelCtas(3)).toBe(false);
  });
});
