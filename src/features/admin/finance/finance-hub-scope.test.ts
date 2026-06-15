import { describe, expect, it } from 'vitest';
import {
  buildOverviewQueryParams,
  resolveSummaryScopeMode,
  resolveValidYearId,
} from '@/features/admin/finance/finance-hub-scope-utils';

const YEARS = [
  { id: 1, name: 'raqeem 2025-2026' },
  { id: 2, name: '2024-2025' },
];

describe('finance hub academic year scope', () => {
  it('resolves all-years mode when yearId is empty', () => {
    expect(resolveSummaryScopeMode('', YEARS)).toBe('all');
  });

  it('resolves year mode for a valid selection', () => {
    expect(resolveSummaryScopeMode('1', YEARS)).toBe('year');
  });

  it('falls back to all-years mode for invalid year ids', () => {
    expect(resolveValidYearId('999', YEARS)).toBe('');
    expect(resolveSummaryScopeMode('999', YEARS)).toBe('all');
  });

  it('omits academic_year_id when all years are selected', () => {
    expect(buildOverviewQueryParams('', YEARS)).toEqual({});
  });

  it('sends academic_year_id only for a valid year', () => {
    expect(buildOverviewQueryParams('2', YEARS)).toEqual({ academic_year_id: 2 });
  });

  it('uses neutral mode while years are loading', () => {
    expect(resolveSummaryScopeMode('', YEARS, true)).toBe('neutral');
  });

  it('uses neutral mode when no academic years exist', () => {
    expect(resolveSummaryScopeMode('', [])).toBe('neutral');
  });
});
