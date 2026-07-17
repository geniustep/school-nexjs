import { describe, expect, it } from 'vitest';
import { resolveStudentHeaderBilingualNames } from './resolve-student-header-names';

describe('resolveStudentHeaderBilingualNames', () => {
  it('shows Arabic primary and Latin secondary when both differ', () => {
    expect(
      resolveStudentHeaderBilingualNames({
        nameAr: 'إسماعيل العمراني',
        nameLatin: 'Ismail El Amrani',
      }),
    ).toEqual({
      primary: 'إسماعيل العمراني',
      secondary: 'Ismail El Amrani',
      primaryDir: 'rtl',
      secondaryDir: 'ltr',
      displayName: 'إسماعيل العمراني',
    });
  });

  it('falls back to a single name when only one language exists', () => {
    expect(
      resolveStudentHeaderBilingualNames({
        nameAr: '',
        nameLatin: 'Ismail El Amrani',
        fallbackDisplay: 'Other',
      }),
    ).toMatchObject({
      primary: 'Ismail El Amrani',
      secondary: null,
      primaryDir: 'ltr',
    });
  });

  it('uses fallback when bilingual fields are empty', () => {
    expect(
      resolveStudentHeaderBilingualNames({
        fallbackDisplay: 'إسماعيل العمراني',
      }),
    ).toMatchObject({
      primary: 'إسماعيل العمراني',
      secondary: null,
      primaryDir: 'rtl',
    });
  });
});
