/** Map Backend channel lifecycle error codes to i18n keys. */

import type { ApiErrorBody } from '@/types/api';
import type {
  AdminChannel,
  AdminChannelAllowedActions,
  ChannelBlockingReason,
  ChannelLifecycleError,
} from '@/types/admin-channel';
import { channelAllows } from './admin-channel-actions';

export const CHANNEL_LIFECYCLE_ERROR_KEYS: Record<string, string> = {
  active_role_not_available: 'channels.lifecycle.errors.activeRoleNotAvailable',
  invalid_active_role: 'channels.lifecycle.errors.activeRoleNotAvailable',
  active_role_conflict: 'channels.lifecycle.errors.activeRoleNotAvailable',
  invalid_channel_type: 'channels.lifecycle.errors.invalidChannelType',
  cross_school_forbidden: 'channels.lifecycle.errors.crossSchoolForbidden',
  immutable_system_field: 'channels.lifecycle.errors.immutableSystemField',
  system_channel_delete_forbidden: 'channels.lifecycle.errors.systemChannelDeleteForbidden',
  communication_channel_delete_blocked: 'channels.lifecycle.errors.deleteBlocked',
  channel_has_communication_history: 'channels.lifecycle.errors.hasHistory',
  archive_forbidden: 'channels.lifecycle.errors.archiveForbidden',
  duplicate_system_channel: 'channels.lifecycle.errors.duplicateSystemChannel',
  invalid_class_reference: 'channels.lifecycle.errors.invalidClassReference',
  invalid_academic_year: 'channels.lifecycle.errors.invalidAcademicYear',
  validation_error: 'channels.lifecycle.errors.validationError',
  not_found: 'channels.lifecycle.errors.notFound',
  forbidden: 'channels.lifecycle.errors.forbidden',
  permission_denied: 'channels.lifecycle.errors.forbidden',
  unauthorized: 'channels.lifecycle.errors.unauthorized',
  unauthenticated: 'channels.lifecycle.errors.unauthorized',
  network_error: 'channels.lifecycle.errors.network',
  server_error: 'channels.lifecycle.errors.server',
};

export const CHANNEL_BLOCKING_REASON_KEYS: Record<string, string> = {
  system_channel_delete_forbidden: 'channels.lifecycle.errors.systemChannelDeleteForbidden',
  channel_has_communication_history: 'channels.lifecycle.errors.hasHistory',
  communication_channel_delete_blocked: 'channels.lifecycle.errors.deleteBlocked',
};

export function channelLifecycleErrorKey(code: string | null | undefined): string {
  if (!code) return 'channels.lifecycle.errors.generic';
  return CHANNEL_LIFECYCLE_ERROR_KEYS[code] ?? 'channels.lifecycle.errors.generic';
}

export function channelBlockingReasonKey(code: string | null | undefined): string {
  if (!code) return 'channels.lifecycle.errors.deleteBlocked';
  return CHANNEL_BLOCKING_REASON_KEYS[code] ?? channelLifecycleErrorKey(code);
}

function asReasonList(raw: unknown): ChannelBlockingReason[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      code: typeof row.code === 'string' ? row.code : 'communication_channel_delete_blocked',
      message: typeof row.message === 'string' ? row.message : null,
      count: typeof row.count === 'number' ? row.count : null,
      ...row,
    }));
}

function asAllowedActions(raw: unknown): AdminChannelAllowedActions | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: AdminChannelAllowedActions = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') out[key] = value;
  }
  return out;
}

export function parseChannelLifecycleError(error: ApiErrorBody): ChannelLifecycleError {
  const details = (error.details ?? {}) as Record<string, unknown>;
  const status = typeof details.status === 'number' ? details.status : undefined;
  const blocking = asReasonList(details.blocking_reasons);
  const allowed = asAllowedActions(details.allowed_actions);
  const channel =
    details.channel && typeof details.channel === 'object'
      ? (details.channel as AdminChannel)
      : null;

  return {
    code: error.code,
    message: error.message,
    status,
    blocking_reasons: blocking,
    allowed_actions: allowed,
    channel,
    history_usage:
      details.history_usage && typeof details.history_usage === 'object'
        ? (details.history_usage as ChannelLifecycleError['history_usage'])
        : null,
  };
}

export function deleteConflictAllowsArchive(error: ChannelLifecycleError): boolean {
  return channelAllows(error.allowed_actions, 'archive');
}
