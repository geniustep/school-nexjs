import { describe, expect, it } from 'vitest';
import {
  SERVICES_PAGE_SIZE,
  resolveServiceListDefaultAmount,
  resolveServiceListPriorityLevel,
  resolveServiceListPriorityTone,
  resolveServicesListEmptyVariant,
  servicesListHasActiveQuery,
} from '@/features/admin/finance/utils/services-list-present';

describe('services-list-present', () => {
  it('maps page size to API page_size 20', () => {
    expect(SERVICES_PAGE_SIZE).toBe(20);
  });

  it('detects active search query', () => {
    expect(servicesListHasActiveQuery({})).toBe(false);
    expect(servicesListHasActiveQuery({ search: '  ' })).toBe(false);
    expect(servicesListHasActiveQuery({ search: 'tuition' })).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveServicesListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveServicesListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('presents priority without changing semantics', () => {
    expect(resolveServiceListPriorityLevel('first')).toBe('first');
    expect(resolveServiceListPriorityLevel('unknown')).toBe('normal');
    expect(resolveServiceListPriorityTone('first')).toBe('amber');
    expect(resolveServiceListPriorityTone('last')).toBe('slate');
    expect(resolveServiceListPriorityTone('normal')).toBe('blue');
  });

  it('presents default amount only when provided', () => {
    expect(resolveServiceListDefaultAmount(undefined)).toBeNull();
    expect(resolveServiceListDefaultAmount(null)).toBeNull();
    expect(resolveServiceListDefaultAmount(150)).toBe(150);
  });
});
