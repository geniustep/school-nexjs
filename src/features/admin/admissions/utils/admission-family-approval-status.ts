/**
 * Detect when a modern action succeeded but Backend did not advance application_status.
 * TEMPORARY_TEST_DATA: names unused — status codes only.
 */
import { resolveApplicationStatus } from './admission-modern-status';

const FAMILY_APPROVAL_ACTIONS = new Set([
  'record_family_approval',
  'accept_and_record_family_approval',
]);

const AFTER_FAMILY_APPROVAL_STATUSES = new Set([
  'ready_for_registration',
  'registered',
]);

/**
 * True when family-approval action returned success payload that is still not
 * ready_for_registration / registered — Backend contract gap the UI should surface.
 */
export function didFamilyApprovalFailToAdvanceStatus(
  action: string,
  record: { application_status?: unknown } | null | undefined,
): boolean {
  if (!FAMILY_APPROVAL_ACTIONS.has(action)) return false;
  const status = resolveApplicationStatus(record);
  if (!status) return true;
  return !AFTER_FAMILY_APPROVAL_STATUSES.has(status);
}
