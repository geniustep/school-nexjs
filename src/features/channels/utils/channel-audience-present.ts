/**
 * Privacy-safe audience presentation for admin channels.
 * class_family never uses member_count as family audience.
 */

import type { Tone } from '@/components/ui/primitives';
import type {
  AdminChannel,
  FamilyAudienceDeliveryState,
  FamilyAudienceExclusionLine,
  FamilyAudienceSummary,
} from '@/types/admin-channel';
import { resolveChannelType } from '@/features/channels/utils/admin-channel-actions';

export const FAMILY_AUDIENCE_QUERY = {
  include_family_audience: '1',
} as const;

export const FAMILY_AUDIENCE_DELIVERY_STATES = [
  'ready',
  'partial',
  'unavailable',
  'empty_class',
] as const satisfies readonly FamilyAudienceDeliveryState[];

const KNOWN_EXCLUSION_CODES = new Set([
  'missing_portal_user',
  'inactive_guardian',
  'missing_user',
]);

function asNonNegativeInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.max(0, Math.trunc(n));
  }
  return 0;
}

function isDeliveryState(value: unknown): value is FamilyAudienceDeliveryState {
  return (
    typeof value === 'string' &&
    (FAMILY_AUDIENCE_DELIVERY_STATES as readonly string[]).includes(value)
  );
}

/** Normalize Backend summary; unknown/invalid → null (safe fallback). */
export function normalizeFamilyAudienceSummary(
  raw: unknown,
): FamilyAudienceSummary | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (!isDeliveryState(row.delivery_state)) return null;

  const exclusion_summary: FamilyAudienceExclusionLine[] = [];
  if (Array.isArray(row.exclusion_summary)) {
    for (const item of row.exclusion_summary) {
      if (item == null || typeof item !== 'object' || Array.isArray(item)) continue;
      const line = item as Record<string, unknown>;
      const code = typeof line.code === 'string' ? line.code.trim() : '';
      if (!code) continue;
      exclusion_summary.push({
        code,
        count: line.count == null ? null : asNonNegativeInt(line.count),
        message: typeof line.message === 'string' ? line.message : null,
      });
    }
  }

  return {
    resolution_source:
      typeof row.resolution_source === 'string' ? row.resolution_source : null,
    student_count: asNonNegativeInt(row.student_count),
    guardian_count: asNonNegativeInt(row.guardian_count),
    deliverable_user_count: asNonNegativeInt(row.deliverable_user_count),
    excluded_count: asNonNegativeInt(row.excluded_count),
    delivery_state: row.delivery_state,
    exclusion_summary,
  };
}

export type ChannelAudienceMode = 'family' | 'staff' | 'members';

export function resolveChannelAudienceMode(
  channel: Pick<AdminChannel, 'channel_type' | 'type'>,
): ChannelAudienceMode {
  const type = resolveChannelType(channel);
  if (type === 'class_family') return 'family';
  if (type === 'class_staff') return 'staff';
  return 'members';
}

export function resolveMemberCount(
  channel: Pick<AdminChannel, 'member_count' | 'member_summary'>,
): number {
  const fromSummary = channel.member_summary?.member_count;
  if (typeof fromSummary === 'number' && Number.isFinite(fromSummary)) {
    return Math.max(0, Math.trunc(fromSummary));
  }
  if (typeof channel.member_count === 'number' && Number.isFinite(channel.member_count)) {
    return Math.max(0, Math.trunc(channel.member_count));
  }
  return 0;
}

export type FamilyAudienceViewModel = {
  mode: 'family';
  summary: FamilyAudienceSummary | null;
  badgeTone: Tone;
  badgeKey: string;
  hintKey: string | null;
};

export type StaffAudienceViewModel = {
  mode: 'staff';
  memberCount: number;
};

export type MembersAudienceViewModel = {
  mode: 'members';
  memberCount: number;
};

export type ChannelAudienceViewModel =
  | FamilyAudienceViewModel
  | StaffAudienceViewModel
  | MembersAudienceViewModel;

export function buildChannelAudienceViewModel(
  channel: Pick<
    AdminChannel,
    'channel_type' | 'type' | 'member_count' | 'member_summary' | 'family_audience_summary'
  >,
): ChannelAudienceViewModel {
  const mode = resolveChannelAudienceMode(channel);
  if (mode === 'staff') {
    return { mode: 'staff', memberCount: resolveMemberCount(channel) };
  }
  if (mode === 'members') {
    return { mode: 'members', memberCount: resolveMemberCount(channel) };
  }

  const summary = normalizeFamilyAudienceSummary(channel.family_audience_summary);
  if (!summary) {
    return {
      mode: 'family',
      summary: null,
      badgeTone: 'slate',
      badgeKey: 'channels.audience.badges.unavailableData',
      hintKey: null,
    };
  }

  switch (summary.delivery_state) {
    case 'ready':
      return {
        mode: 'family',
        summary,
        badgeTone: 'green',
        badgeKey: 'channels.audience.badges.ready',
        hintKey: null,
      };
    case 'partial':
      return {
        mode: 'family',
        summary,
        badgeTone: 'amber',
        badgeKey: 'channels.audience.badges.partial',
        hintKey: 'channels.audience.hints.partialAccounts',
      };
    case 'unavailable':
      return {
        mode: 'family',
        summary,
        badgeTone: 'amber',
        badgeKey: 'channels.audience.badges.unavailable',
        hintKey: 'channels.audience.hints.noDeliverableAccounts',
      };
    case 'empty_class':
      return {
        mode: 'family',
        summary,
        badgeTone: 'slate',
        badgeKey: 'channels.audience.badges.emptyClass',
        hintKey: null,
      };
    default:
      return {
        mode: 'family',
        summary: null,
        badgeTone: 'slate',
        badgeKey: 'channels.audience.badges.unavailableData',
        hintKey: null,
      };
  }
}

/**
 * Known exclusion codes may refine partial copy.
 * Never surface raw codes in the UI — return i18n keys only.
 */
export function resolveFamilyPartialHintKey(
  summary: FamilyAudienceSummary | null,
): string {
  if (!summary || summary.delivery_state !== 'partial') {
    return 'channels.audience.hints.partialAccounts';
  }
  const codes = summary.exclusion_summary.map((line) => line.code);
  if (codes.length === 0) return 'channels.audience.hints.partialAccounts';

  const hasMissingPortal = codes.includes('missing_portal_user');
  const onlyKnown = codes.every((code) => KNOWN_EXCLUSION_CODES.has(code));
  if (hasMissingPortal && onlyKnown) {
    return 'channels.audience.hints.missingPortalUser';
  }
  return 'channels.audience.hints.partialAccounts';
}
