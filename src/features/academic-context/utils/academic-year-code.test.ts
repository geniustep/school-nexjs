import { describe, expect, it } from 'vitest';
import {
  deriveCanonicalAcademicYearCode,
  normalizeAcademicYearOption,
} from '@/features/academic-context/utils/normalize-academic-context';

describe('canonical academic year code', () => {
  it('uses only the start and end years for a standard school calendar', () => {
    expect(
      deriveCanonicalAcademicYearCode('2026-09-01', '2027-06-30'),
    ).toBe('2026-2027');
  });

  it('uses the same canonical code for a training institute with different month/day boundaries', () => {
    expect(
      deriveCanonicalAcademicYearCode('2026-08-15', '2027-07-10'),
    ).toBe('2026-2027');
  });

  it.each([
    ['2026/2027', '2026/2027'],
    ['2026_2027', '2026_2027'],
    ['2026', '2026'],
  ])('normalizes legacy year identity %s from actual dates', (name, code) => {
    const year = normalizeAcademicYearOption({
      id: 7,
      name,
      code,
      date_start: '2026-09-01',
      date_end: '2027-06-30',
    });

    expect(year?.name).toBe('2026-2027');
    expect(year?.code).toBe('2026-2027');
  });

  it('preserves a descriptive display name while canonicalizing the technical code', () => {
    const year = normalizeAcademicYearOption({
      id: 8,
      name: 'السنة الدراسية الحالية',
      code: '2026/2027',
      date_start: '2026-08-15',
      date_end: '2027-07-10',
    });

    expect(year?.name).toBe('السنة الدراسية الحالية');
    expect(year?.code).toBe('2026-2027');
  });

  it('does not guess a canonical code when the actual date range is unavailable', () => {
    const year = normalizeAcademicYearOption({
      id: 9,
      name: '2026',
      code: '2026',
    });

    expect(year?.name).toBe('2026');
    expect(year?.code).toBe('2026');
    expect(deriveCanonicalAcademicYearCode('2026-13-01', '2027-06-30')).toBeNull();
    expect(deriveCanonicalAcademicYearCode('2027-09-01', '2026-06-30')).toBeNull();
  });
});
