import type { CurrentUser } from '@/types/user';
import { hasUserCapability } from '@/lib/permissions/academic-capabilities';
import { hasPermission } from '@/lib/permissions/permissions';

export const COMMUNICATION_CAPABILITIES = {
  view: 'communication.content.view',
  create: 'communication.content.create',
  submit: 'communication.content.submit',
  review: 'communication.content.review',
  approve: 'communication.content.approve',
  publish: 'communication.content.publish',
  schedule: 'communication.content.schedule',
  cancel: 'communication.content.cancel',
  audit: 'communication.audit.view',
} as const;

export function hasCommunicationCapability(
  user: CurrentUser | null | undefined,
  code: string,
): boolean {
  return hasUserCapability(user, code);
}

/**
 * Channel / messaging workspace access.
 * `view_channels` remains valid here — it must NOT gate the content review center.
 */
export function canViewCommunicationWorkspace(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  if (hasCommunicationCapability(user, COMMUNICATION_CAPABILITIES.view)) return true;
  if (hasCommunicationCapability(user, COMMUNICATION_CAPABILITIES.review)) return true;
  return hasPermission(user, 'view_channels');
}

/**
 * Content review center gate — official Odoo capability only.
 * `view_channels` alone must never grant review-center access.
 */
export function canReviewCommunication(user: CurrentUser | null | undefined): boolean {
  if (!user || user.role !== 'admin') return false;
  return hasCommunicationCapability(user, COMMUNICATION_CAPABILITIES.review);
}

/** Record actions — Backend `allowed_actions` only; never invent from capabilities. */
export function hasCommunicationRecordAction(
  allowedActions: readonly string[] | null | undefined,
  action: string,
): boolean {
  return (allowedActions ?? []).includes(action);
}

export function isCommunicationReviewPath(pathname: string): boolean {
  const base = pathname.split('?')[0];
  return base === '/admin/communication' || base.startsWith('/admin/communication/');
}
