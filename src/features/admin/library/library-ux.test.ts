import { describe, expect, it } from 'vitest';
import { libraryCheckoutBlockedReason, type LibraryCopyRow } from './library-contract';
import { isLibraryDueAtFuture, libraryDueStatus, minimumLibraryDueAt } from './library-dates';
import { buildLibraryViewSearch, parseLibraryViewSearch } from './library-view-state';
import { isExactLibraryCopyIdentifierMatch, mergeUniqueLibraryCopies } from './quick-copy-lookup';

function copy(overrides: Partial<LibraryCopyRow> = {}): LibraryCopyRow {
  return {
    id: 1,
    title: { id: 2, name: 'كتاب' },
    accession: 'ACC-1',
    barcode: 'BAR-1',
    shelf: 'A1',
    circulation_policy: 'loanable',
    state: 'available',
    condition: 'good',
    active: true,
    allowed_actions: { checkout: true, edit: true },
    ...overrides,
  };
}

describe('physical library UX helpers', () => {
  it('round-trips a shareable circulation view through the URL', () => {
    const search = buildLibraryViewSearch({
      tab: 'circulation',
      circulationFilter: 'overdue',
      catalogPolicy: '',
      copyState: '',
      query: 'الرياضيات',
      page: 3,
    });
    expect(parseLibraryViewSearch(search)).toEqual({
      tab: 'circulation',
      circulationFilter: 'overdue',
      catalogPolicy: '',
      copyState: '',
      query: 'الرياضيات',
      page: 3,
    });
  });

  it('rejects invalid URL state instead of leaking it into API queries', () => {
    expect(parseLibraryViewSearch('?tab=bad&state=hacked&page=-9')).toMatchObject({
      tab: 'catalog',
      copyState: '',
      page: 1,
    });
  });

  it('describes overdue and due-today loans deterministically', () => {
    const now = new Date('2026-08-14T10:00:00');
    expect(libraryDueStatus('2026-08-12T12:00:00', true, 'checked_out', now)).toEqual({ label: 'متأخر يومين', tone: 'overdue' });
    expect(libraryDueStatus('2026-08-14T18:00:00', false, 'checked_out', now)).toEqual({ label: 'يستحق اليوم', tone: 'today' });
  });

  it('prevents checkout with a due time in the past', () => {
    const now = new Date('2026-08-14T10:00:00');
    expect(isLibraryDueAtFuture('2026-08-14T09:59', now)).toBe(false);
    expect(isLibraryDueAtFuture('2026-08-14T10:01', now)).toBe(true);
    expect(minimumLibraryDueAt(now)).toBe('2026-08-14T10:01');
  });

  it('matches scanner input exactly against barcode or accession', () => {
    expect(isExactLibraryCopyIdentifierMatch(copy(), ' bar-1 ')).toBe(true);
    expect(isExactLibraryCopyIdentifierMatch(copy(), 'acc-1')).toBe(true);
    expect(isExactLibraryCopyIdentifierMatch(copy(), 'acc')).toBe(false);
  });

  it('merges direct copy results with title/author-derived copies without duplicates', () => {
    const direct = copy({ id: 1, accession: 'A-1' });
    const fromAuthorSearch = copy({ id: 2, accession: 'A-2', title: { id: 9, name: 'رياضيات' } });
    expect(mergeUniqueLibraryCopies([direct], [direct, fromAuthorSearch])).toEqual([direct, fromAuthorSearch]);
  });

  it('explains why a physical copy cannot be checked out', () => {
    expect(libraryCheckoutBlockedReason(copy({ circulation_policy: 'library_only', allowed_actions: { checkout: false } }))).toContain('داخل المكتبة');
    expect(libraryCheckoutBlockedReason(copy({ state: 'on_loan', allowed_actions: { checkout: false } }))).toContain('معارة');
    expect(libraryCheckoutBlockedReason(copy())).toBeNull();
  });
});
