/**
 * Decides whether the collection-context card may render functional empty/error
 * states (no active agreement, prepayment unavailable, no open balance).
 *
 * While the collectible-items request is in flight — or before it has produced
 * either data or an error — the context is NOT resolved, so the card must show a
 * neutral loading placeholder instead of a misleading "no agreement" state.
 * Null/undefined during loading means "not loaded yet", never "no agreement".
 */
export function isCollectionContextResolved(params: {
  loading: boolean;
  hasData: boolean;
  hasError: boolean;
}): boolean {
  if (params.loading) return false;
  return params.hasData || params.hasError;
}

/** Inverse of {@link isCollectionContextResolved}: true while a neutral placeholder should show. */
export function isCollectionContextLoading(params: {
  loading: boolean;
  hasData: boolean;
  hasError: boolean;
}): boolean {
  return !isCollectionContextResolved(params);
}
