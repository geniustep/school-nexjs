export type CancelFutureTargetState = 'cancelled' | 'waived';

export function validateCancelFutureInstallments(input: {
  effectiveDate: string;
  reason: string;
  targetState: string;
}): string | null {
  if (!input.effectiveDate.trim()) return 'dateRequired';
  if (!input.reason.trim()) return 'reasonRequired';
  if (input.targetState !== 'cancelled' && input.targetState !== 'waived') return 'targetRequired';
  return null;
}
