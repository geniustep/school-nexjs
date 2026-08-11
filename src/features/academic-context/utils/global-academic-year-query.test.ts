import { describe, expect, it } from 'vitest';
import { buildGlobalAcademicYearQuery } from './global-academic-year-query';

describe('buildGlobalAcademicYearQuery', () => {
  it('keeps the query unchanged while no global year is resolved', () => {
    const query = { page: 2, search: 'سلمى' };
    expect(buildGlobalAcademicYearQuery(query, null)).toBe(query);
  });

  it('adds the explicit global academic year to an operational query', () => {
    expect(buildGlobalAcademicYearQuery({ page: 1 }, 42)).toEqual({
      page: 1,
      academic_year_id: 42,
    });
  });

  it('makes the global year authoritative over stale page-local state', () => {
    expect(
      buildGlobalAcademicYearQuery(
        { page: 1, academic_year_id: 7 },
        42,
      ),
    ).toEqual({
      page: 1,
      academic_year_id: 42,
    });
  });
});
