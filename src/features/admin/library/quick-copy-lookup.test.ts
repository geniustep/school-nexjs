import { describe, expect, it } from 'vitest';
import {
  isExactLibraryCopyIdentifierMatch,
  libraryQuickLookupEmptyKind,
  mergeUniqueLibraryCopies,
} from './quick-copy-lookup';
import type { LibraryCopyRow } from './library-contract';

function copy(overrides: Partial<LibraryCopyRow> = {}): LibraryCopyRow {
  return {
    id: 1,
    title: { id: 2, name: 'كتاب' },
    accession: 'A-001',
    barcode: '9780001',
    shelf: 'R1',
    circulation_policy: 'loanable',
    state: 'available',
    condition: 'good',
    active: true,
    allowed_actions: { checkout: true },
    ...overrides,
  };
}

describe('quick library copy lookup', () => {
  it('matches accession and barcode identifiers exactly after trimming/case normalization', () => {
    const row = copy();
    expect(isExactLibraryCopyIdentifierMatch(row, ' A-001 ')).toBe(true);
    expect(isExactLibraryCopyIdentifierMatch(row, 'a-001')).toBe(true);
    expect(isExactLibraryCopyIdentifierMatch(row, '9780001')).toBe(true);
  });

  it('does not treat title-like or partial values as exact copy identifiers', () => {
    const row = copy();
    expect(isExactLibraryCopyIdentifierMatch(row, 'A-00')).toBe(false);
    expect(isExactLibraryCopyIdentifierMatch(row, 'كتاب')).toBe(false);
  });

  it('never reports no-match when a title matched but has zero physical copies', () => {
    expect(libraryQuickLookupEmptyKind(1, 0)).toBe('title_without_copies');
    expect(libraryQuickLookupEmptyKind(3, 0)).toBe('title_without_copies');
    expect(libraryQuickLookupEmptyKind(0, 0)).toBe('no_match');
    expect(libraryQuickLookupEmptyKind(1, 2)).toBeNull();
  });

  it('merges direct copy and title-derived results without duplicate physical copies', () => {
    const first = copy({ id: 1 });
    const second = copy({ id: 2, accession: 'A-002', barcode: '9780002' });
    expect(mergeUniqueLibraryCopies([first], [first, second])).toEqual([first, second]);
  });
});
