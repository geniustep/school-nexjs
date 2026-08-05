import { describe, expect, it } from 'vitest';
import {
  canCreateAdminChannel,
  channelAllows,
  channelNeedsClassId,
  isSystemChannelType,
  resolveChannelType,
} from './admin-channel-actions';
import {
  channelLifecycleErrorKey,
  deleteConflictAllowsArchive,
  parseChannelLifecycleError,
} from './channel-lifecycle-errors';
import { assertBffRoutePolicy } from '@/lib/api/bff-route-policy';

describe('admin-channel-actions', () => {
  it('derives create/update/delete only from Backend booleans', () => {
    expect(canCreateAdminChannel({ create_channel: true })).toBe(true);
    expect(canCreateAdminChannel({ create_channel: false })).toBe(false);
    expect(canCreateAdminChannel(undefined)).toBe(false);
    expect(channelAllows({ update: true }, 'update')).toBe(true);
    expect(channelAllows({ delete: false }, 'delete')).toBe(false);
    expect(channelAllows({ archive: true, restore: false }, 'archive')).toBe(true);
    expect(channelAllows({ restore: true }, 'restore')).toBe(true);
  });

  it('does not infer delete from history or channel type', () => {
    const channel = {
      channel_type: 'teachers',
      has_history: false,
      member_count: 0,
      allowed_actions: { delete: false },
    };
    expect(channelAllows(channel.allowed_actions, 'delete')).toBe(false);
    expect(isSystemChannelType('class_staff')).toBe(true);
    expect(channelNeedsClassId('class_family')).toBe(true);
    expect(resolveChannelType({ channel_type: 'class_staff', type: 'teachers' })).toBe(
      'class_staff',
    );
  });
});

describe('channel-lifecycle-errors', () => {
  it('maps lifecycle codes and preserves 409 blocking_reasons', () => {
    expect(channelLifecycleErrorKey('active_role_not_available')).toBe(
      'channels.lifecycle.errors.activeRoleNotAvailable',
    );
    expect(channelLifecycleErrorKey('cross_school_forbidden')).toBe(
      'channels.lifecycle.errors.crossSchoolForbidden',
    );
    expect(channelLifecycleErrorKey('system_channel_delete_forbidden')).toBe(
      'channels.lifecycle.errors.systemChannelDeleteForbidden',
    );

    const parsed = parseChannelLifecycleError({
      code: 'communication_channel_delete_blocked',
      message: 'blocked',
      details: {
        status: 409,
        blocking_reasons: [
          { code: 'channel_has_communication_history', message: 'history' },
        ],
        allowed_actions: { archive: true, delete: false, update: false },
      },
    });
    expect(parsed.status).toBe(409);
    expect(parsed.blocking_reasons?.[0]?.code).toBe('channel_has_communication_history');
    expect(deleteConflictAllowsArchive(parsed)).toBe(true);
  });

  it('hides archive fallback when Backend does not allow archive', () => {
    const parsed = parseChannelLifecycleError({
      code: 'system_channel_delete_forbidden',
      message: 'system',
      details: {
        status: 409,
        blocking_reasons: [{ code: 'system_channel_delete_forbidden' }],
        allowed_actions: { archive: false, delete: false },
      },
    });
    expect(deleteConflictAllowsArchive(parsed)).toBe(false);
  });
});

describe('BFF channel lifecycle routes', () => {
  it('allows admin channel PATCH/DELETE/archive/restore via existing family policy', () => {
    expect(assertBffRoutePolicy('/admin/channels', 'POST').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/channels/10', 'PATCH').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/channels/10', 'DELETE').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/channels/10/archive', 'POST').ok).toBe(true);
    expect(assertBffRoutePolicy('/admin/channels/10/restore', 'POST').ok).toBe(true);
  });
});
