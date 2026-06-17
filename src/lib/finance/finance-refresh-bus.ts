export const FINANCE_REFRESH_EVENT = 'raqeem:finance-refresh';

export type FinanceRefreshDetail = {
  studentId?: number | null;
  collectionId?: number | null;
  chequeId?: number | null;
};

export function emitFinanceRefresh(detail?: FinanceRefreshDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<FinanceRefreshDetail>(FINANCE_REFRESH_EVENT, { detail }));
}

export function subscribeFinanceRefresh(
  handler: (detail: FinanceRefreshDetail | undefined) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const listener = (event: Event) => {
    handler((event as CustomEvent<FinanceRefreshDetail>).detail);
  };
  window.addEventListener(FINANCE_REFRESH_EVENT, listener);
  return () => window.removeEventListener(FINANCE_REFRESH_EVENT, listener);
}
