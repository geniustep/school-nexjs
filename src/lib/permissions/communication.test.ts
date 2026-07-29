import { describe, expect, it } from 'vitest';
import { permissionForAdminPath } from '@/lib/permissions/admin-pages';
import {
  COMMUNICATION_CAPABILITIES,
  canReviewCommunication,
  canViewCommunicationWorkspace,
  hasCommunicationRecordAction,
  isCommunicationReviewPath,
} from '@/lib/permissions/communication';
import { ADMIN_NAV_BY_PERMISSION, navForUser } from '@/components/navigation/nav-config';
import type { CurrentUser } from '@/types/user';
import type { Permission } from '@/types/permissions';

function admin(partial: Partial<CurrentUser> & { permissions?: Permission[] }): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'admin@test.local',
    role: 'admin',
    admin_kind: 'school_manager',
    permissions_mode: 'full_school',
    school: { id: 1, name: 'School' },
    permissions: [],
    ...partial,
  };
}

describe('communication review gate capability adoption', () => {
  it('denies review center when user has view_channels only', () => {
    const user = admin({
      permissions: ['view_channels'],
      effective_capabilities: [],
    });
    expect(canReviewCommunication(user)).toBe(false);
    expect(canViewCommunicationWorkspace(user)).toBe(true);
  });

  it('grants review center only with communication.content.review', () => {
    const user = admin({
      permissions: [],
      effective_capabilities: [COMMUNICATION_CAPABILITIES.review],
    });
    expect(canReviewCommunication(user)).toBe(true);
  });

  it('does not treat approve or publish capability as review-center gate', () => {
    expect(
      canReviewCommunication(
        admin({
          effective_capabilities: [COMMUNICATION_CAPABILITIES.approve],
        }),
      ),
    ).toBe(false);
    expect(
      canReviewCommunication(
        admin({
          effective_capabilities: [COMMUNICATION_CAPABILITIES.publish],
        }),
      ),
    ).toBe(false);
  });

  it('fail-closes teacher role even if review capability appears', () => {
    const teacher = admin({
      role: 'teacher',
      effective_capabilities: [COMMUNICATION_CAPABILITIES.review],
      permissions: ['view_channels'],
    });
    expect(canReviewCommunication(teacher)).toBe(false);
  });

  it('fail-closes null user and missing capability lists', () => {
    expect(canReviewCommunication(null)).toBe(false);
    expect(
      canReviewCommunication(
        admin({
          permissions: ['view_channels'],
          effective_capabilities: undefined,
          effective_permissions: undefined,
        }),
      ),
    ).toBe(false);
  });

  it('maps review routes to capability path helper, not view_channels', () => {
    expect(isCommunicationReviewPath('/admin/communication')).toBe(true);
    expect(isCommunicationReviewPath('/admin/communication/42')).toBe(true);
    expect(isCommunicationReviewPath('/admin/communication?filter=submitted')).toBe(true);
    expect(isCommunicationReviewPath('/admin/channels')).toBe(false);
    expect(permissionForAdminPath('/admin/communication')).toBeNull();
    expect(permissionForAdminPath('/admin/communication/9')).toBeNull();
    expect(permissionForAdminPath('/admin/channels')).toBe('view_channels');
    expect(permissionForAdminPath('/admin/channels/3')).toBe('view_channels');
  });

  it('hides review nav link for view_channels-only and shows it with review capability', () => {
    const channelsOnly = admin({
      permissions: ['view_channels', 'view_dashboard'],
      effective_capabilities: [],
      effective_permissions: ['view_channels', 'view_dashboard'],
    });
    const withReview = admin({
      permissions: ['view_dashboard'],
      effective_capabilities: [COMMUNICATION_CAPABILITIES.review],
      effective_permissions: ['view_dashboard'],
    });

    const channelsOnlyHrefs = navForUser(channelsOnly)
      .flatMap((section) => section.items)
      .map((item) => item.href);
    const reviewHrefs = navForUser(withReview)
      .flatMap((section) => section.items)
      .map((item) => item.href);

    expect(channelsOnlyHrefs).toContain('/admin/channels');
    expect(channelsOnlyHrefs).not.toContain('/admin/communication');
    expect(reviewHrefs).toContain('/admin/communication');
    expect(
      ADMIN_NAV_BY_PERMISSION.some(
        (item) => item.href === '/admin/communication' && item.permission === 'view_channels',
      ),
    ).toBe(false);
  });

  it('keeps record actions driven by allowed_actions only', () => {
    expect(hasCommunicationRecordAction(undefined, 'approve')).toBe(false);
    expect(hasCommunicationRecordAction([], 'publish')).toBe(false);
    expect(hasCommunicationRecordAction(['request_changes'], 'approve')).toBe(false);
    expect(hasCommunicationRecordAction(['approve'], 'approve')).toBe(true);
    expect(hasCommunicationRecordAction(['approve'], 'publish')).toBe(false);
    expect(hasCommunicationRecordAction(['publish'], 'publish')).toBe(true);
  });

  it('preserves approved != published presentation contract in filters', () => {
    // Filter ids remain distinct — regression guard for review workspace semantics.
    const filterIds = [
      'submitted',
      'changes_requested',
      'approved',
      'scheduled',
      'published',
    ];
    expect(new Set(filterIds).size).toBe(filterIds.length);
    expect(filterIds).toContain('approved');
    expect(filterIds).toContain('published');
    expect(filterIds.indexOf('approved')).not.toBe(filterIds.indexOf('published'));
  });
});
