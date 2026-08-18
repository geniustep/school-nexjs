import { describe, expect, it } from 'vitest';
import { createLibraryImportIdempotencyKey } from './library-import-session';

describe('library import idempotency session', () => {
  it('uses one caller-provided identity for the same selected import session', () => {
    expect(createLibraryImportIdempotencyKey(() => 'session-123')).toBe(
      'nextjs-library-import-session-123',
    );
  });

  it('keeps different import sessions distinguishable', () => {
    expect(createLibraryImportIdempotencyKey(() => 'session-a')).not.toBe(
      createLibraryImportIdempotencyKey(() => 'session-b'),
    );
  });
});
