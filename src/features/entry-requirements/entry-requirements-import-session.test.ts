import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEntryRequirementImportIdempotencyKey,
  duplicatePreviewRowNumbers,
} from './entry-requirements-import-session';

test('entry requirement import idempotency key is stable for injected session UUID', () => {
  assert.equal(
    createEntryRequirementImportIdempotencyKey(() => 'session-123'),
    'nextjs-entry-requirements-session-123',
  );
});

test('duplicate preview rows are reported without merging distinct editions', () => {
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

  assert.deepEqual(duplicates, [1, 2]);
});
