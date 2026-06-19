import { describe, expect, it } from 'vitest';
import { resolveAcademicYearName } from '@/lib/utils/academic-years';

describe('resolveAcademicYearName', () => {
  it('returns embedded name when API includes academic_year object', () => {
    expect(
      resolveAcademicYearName({
        academic_year_id: 1,
        academic_year: { id: 1, name: '2025-2026' },
      }),
    ).toBe('2025-2026');
  });

  it('resolves name from lookup when only academic_year_id is present', () => {
    expect(
      resolveAcademicYearName({ academic_year_id: 1 }, [{ id: 1, name: 'raqeem 2025-2026' }]),
    ).toBe('raqeem 2025-2026');
  });

  it('returns null when id-only payload has no lookup match', () => {
    expect(resolveAcademicYearName({ academic_year_id: 99 }, [{ id: 1, name: '2025-2026' }])).toBeNull();
  });

  it('uses academic_year_name when provided without object ref', () => {
    expect(
      resolveAcademicYearName({ academic_year_id: 1, academic_year_name: 'raqeem 2025-2026' }),
    ).toBe('raqeem 2025-2026');
  });
});
