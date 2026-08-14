import { describe, expect, it } from 'vitest';

import {
  createEntryRequirementImportIdempotencyKey,
  duplicatePreviewRowNumbers,
} from './entry-requirements-import-session';

describe('entry requirement XLSX import session', () => {
  it('keeps the idempotency key stable for the injected file-session UUID', () => {
    expect(createEntryRequirementImportIdempotencyKey(() => 'session-123')).toBe(
      'nextjs-entry-requirements-session-123',
    );
  });

  it('reports duplicate preview rows without merging distinct editions', () => {
    const duplicates = duplicatePreviewRowNumbers([
      {
        row_number: 1,
        valid: true,
        item: { item_type: 'book', name: 'رياضيات', quantity: 1, isbn: '978-1', edition: '2026' },
      },
      {
        row_number: 2,
        valid: true,
        item: { item_type: 'book', name: 'رياضيات', quantity: 1, isbn: '9781', edition: '2026' },
      },
      {
        row_number: 3,
        valid: true,
        item: { item_type: 'book', name: 'رياضيات', quantity: 1, isbn: '978-2', edition: '2025' },
      },
      {
        row_number: 4,
        valid: false,
        item: { item_type: 'book', name: 'رياضيات', quantity: 1, isbn: '9781', edition: '2026' },
      },
    ]);

    expect(duplicates).toEqual([1, 2]);
  });
});
