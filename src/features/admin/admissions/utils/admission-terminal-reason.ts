import type { AdmissionLastAction, AdmissionRejection } from '@/types/admission';
import { cleanDisplayValue } from './admission-labels';
import { resolveApplicationStatus } from './admission-modern-status';
import { resolveRejectionReason } from './admission-rejection';

export type AdmissionTerminalReasonKind = 'rejected' | 'closed';

export type AdmissionTerminalReasonSource = {
  application_status?: unknown;
  rejection?: AdmissionRejection | null;
  lost_reason?: string | false | null;
  decision?: unknown;
  decision_notes?: string | false | null;
  last_action?: AdmissionLastAction | null;
};

export type AdmissionTerminalReasonPanel = {
  kind: AdmissionTerminalReasonKind;
  titleKey: string;
  emptyKey: string;
  reason: string;
};

function cleanReasonText(value: unknown): string {
  return cleanDisplayValue(value);
}

/**
 * Closure reason from Admissions contract fields only.
 * Prefer detail `lost_reason`, then list/detail `last_action.note` when the last action is close.
 */
export function resolveClosureReason(record: AdmissionTerminalReasonSource): string {
  const fromLost = cleanReasonText(record.lost_reason);
  if (fromLost) return fromLost;

  const action = record.last_action;
  if (!action || typeof action !== 'object') return '';
  const code = cleanReasonText(action.code).toLowerCase();
  if (code === 'close') {
    return cleanReasonText(action.note);
  }
  return '';
}

function resolveRejectedReasonText(record: AdmissionTerminalReasonSource): string {
  const rejectionReason = cleanReasonText(record.rejection?.reason);
  if (rejectionReason) return rejectionReason;

  const fromContract = resolveRejectionReason({
    rejection: record.rejection
      ? { ...record.rejection, reason: rejectionReason || null }
      : null,
    lost_reason: typeof record.lost_reason === 'string' ? record.lost_reason : null,
    decision: record.decision as never,
    decision_notes:
      typeof record.decision_notes === 'string' ? record.decision_notes : null,
  });
  if (fromContract) return fromContract;

  const action = record.last_action;
  if (!action || typeof action !== 'object') return '';
  const code = cleanReasonText(action.code).toLowerCase();
  if (code === 'reject' || code === 'rejected') {
    return cleanReasonText(action.note);
  }
  return '';
}

/** When status is rejected/closed, replace next-action UI with a reason panel. */
export function resolveAdmissionTerminalReasonPanel(
  record: AdmissionTerminalReasonSource | null | undefined,
): AdmissionTerminalReasonPanel | null {
  const status = resolveApplicationStatus(record);
  if (status === 'rejected') {
    return {
      kind: 'rejected',
      titleKey: 'admin.admissions.terminalReason.rejectionTitle',
      emptyKey: 'admin.admissions.terminalReason.noRejectionReason',
      reason: resolveRejectedReasonText(record ?? {}),
    };
  }
  if (status === 'closed') {
    return {
      kind: 'closed',
      titleKey: 'admin.admissions.terminalReason.closureTitle',
      emptyKey: 'admin.admissions.terminalReason.noClosureReason',
      reason: resolveClosureReason(record ?? {}),
    };
  }
  return null;
}

export function isAdmissionTerminalReasonStatus(
  status: string | null | undefined,
): status is AdmissionTerminalReasonKind {
  return status === 'rejected' || status === 'closed';
}
