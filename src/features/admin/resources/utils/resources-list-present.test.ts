import { describe, expect, it } from 'vitest';
import {
  formatResourceListDate,
  formatResourceTypeLabel,
  RESOURCES_PAGE_SIZE,
  resourcesListHasActiveQuery,
  resolveResourcesListEmptyVariant,
} from '@/features/admin/resources/utils/resources-list-present';

describe('resources-list-present', () => {
  it('uses page size 20 for API pagination', () => {
    expect(RESOURCES_PAGE_SIZE).toBe(20);
  });

  it('detects active filters without inventing name search', () => {
    expect(resourcesListHasActiveQuery({})).toBe(false);
    expect(resourcesListHasActiveQuery({ typeFilter: '  ' })).toBe(false);
    expect(resourcesListHasActiveQuery({ typeFilter: 'pdf' })).toBe(true);
    expect(resourcesListHasActiveQuery({ classId: '12' })).toBe(true);
    expect(resourcesListHasActiveQuery({ stateFilter: 'published' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveResourcesListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveResourcesListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('formats dates or returns empty label', () => {
    expect(formatResourceListDate(null, () => '01/01/2026', '—')).toBe('—');
    expect(formatResourceListDate('2026-01-01', (v) => `fmt:${v}`, '—')).toBe('fmt:2026-01-01');
  });

  it('presents resource type in uppercase for table cells', () => {
    expect(formatResourceTypeLabel(null, '—')).toBe('—');
    expect(formatResourceTypeLabel('  pdf  ', '—')).toBe('PDF');
  });
});
