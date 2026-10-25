/** Localize known follow-up states without changing the API contract. */
export function arrearsFollowupStatusLabel(
  status: string | null | undefined,
  label: string | null | undefined,
  translate: (key: string) => string,
  fallback: string,
): string {
  const code = (status ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const supplied = (label ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const known: Record<string, string> = {
    needs_followup: 'needsFollowup',
    payment_promise: 'paymentPromise',
    escalated: 'escalated',
    resolved: 'resolved',
  };
  const statusKey = known[code] ??
    (supplied === 'needs follow up' ? 'needsFollowup' :
      supplied === 'payment promise' ? 'paymentPromise' :
      supplied === 'escalated' ? 'escalated' :
      supplied === 'resolved' || supplied === 'closed' ? 'resolved' : undefined);
  return statusKey
    ? translate(`admin.finance.arrears.statuses.${statusKey}`)
    : label?.trim() || status?.trim() || fallback;
}
