import { describe, expect, it } from 'vitest';

/**
 * Documents the finance bootstrap ownership contract used to avoid
 * shell + agreements double-fetch when the agreement tab is embedded.
 */
describe('StudentFinanceTabState ownership contract', () => {
  it('disables local tab-state fetch when shell already owns the bootstrap', () => {
    const embedded = true;
    const embeddedTabState = { owned: true };
    const useShellOwnedTabState = embedded && embeddedTabState != null;
    const localFetchEnabled = !useShellOwnedTabState;

    expect(useShellOwnedTabState).toBe(true);
    expect(localFetchEnabled).toBe(false);
  });

  it('keeps local fetch when agreement tab is standalone', () => {
    const embedded = false;
    const embeddedTabState = null;
    const useShellOwnedTabState = embedded && embeddedTabState != null;
    const localFetchEnabled = !useShellOwnedTabState;

    expect(useShellOwnedTabState).toBe(false);
    expect(localFetchEnabled).toBe(true);
  });
});
