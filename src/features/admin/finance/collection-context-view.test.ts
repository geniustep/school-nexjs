import { describe, expect, it } from 'vitest';
import {
  isCollectionContextLoading,
  isCollectionContextResolved,
} from './collection-context-view';

describe('collection context resolution (flicker guard)', () => {
  it('is NOT resolved while the request is loading (initial open)', () => {
    expect(
      isCollectionContextResolved({ loading: true, hasData: false, hasError: false }),
    ).toBe(false);
    expect(
      isCollectionContextLoading({ loading: true, hasData: false, hasError: false }),
    ).toBe(true);
  });

  it('is NOT resolved when loading even if stale data exists (student change / refetch)', () => {
    expect(
      isCollectionContextResolved({ loading: true, hasData: true, hasError: false }),
    ).toBe(false);
  });

  it('is NOT resolved before the first request settles (no data, no error, not loading yet)', () => {
    // Effect has not flipped loading on yet, but nothing has resolved either.
    expect(
      isCollectionContextResolved({ loading: false, hasData: false, hasError: false }),
    ).toBe(false);
    expect(
      isCollectionContextLoading({ loading: false, hasData: false, hasError: false }),
    ).toBe(true);
  });

  it('is resolved once data has loaded', () => {
    expect(
      isCollectionContextResolved({ loading: false, hasData: true, hasError: false }),
    ).toBe(true);
    expect(
      isCollectionContextLoading({ loading: false, hasData: true, hasError: false }),
    ).toBe(false);
  });

  it('is resolved once an error has settled (real failure, not a flicker)', () => {
    expect(
      isCollectionContextResolved({ loading: false, hasData: false, hasError: true }),
    ).toBe(true);
  });
});
