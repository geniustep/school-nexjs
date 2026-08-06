import { describe, expect, it } from 'vitest';
import {
  buildChannelAudienceViewModel,
  normalizeFamilyAudienceSummary,
  resolveChannelAudienceMode,
  resolveFamilyPartialHintKey,
  resolveMemberCount,
} from './channel-audience-present';

/** Synthetic tenant-shaped fixtures — no real PII or IDs. */
const AHLEN_LIKE = [
  {
    type: 'class_family' as const,
    channel_type: 'class_family' as const,
    member_count: 0,
    family_audience_summary: {
      student_count: 0,
      guardian_count: 0,
      deliverable_user_count: 0,
      excluded_count: 0,
      delivery_state: 'empty_class' as const,
      exclusion_summary: [],
    },
  },
  {
    type: 'class_staff' as const,
    channel_type: 'class_staff' as const,
    member_count: 2,
    family_audience_summary: null,
  },
];

const NIBRAS_LIKE_PARTIAL = {
  type: 'class_family' as const,
  channel_type: 'class_family' as const,
  member_count: 0,
  family_audience_summary: {
    student_count: 20,
    guardian_count: 18,
    deliverable_user_count: 12,
    excluded_count: 6,
    delivery_state: 'partial' as const,
    exclusion_summary: [{ code: 'missing_portal_user', count: 6 }],
  },
};

const ALWAH_LIKE_MIXED = [
  {
    type: 'class_family' as const,
    channel_type: 'class_family' as const,
    member_count: 0,
    family_audience_summary: {
      student_count: 5,
      guardian_count: 5,
      deliverable_user_count: 5,
      excluded_count: 0,
      delivery_state: 'ready' as const,
      exclusion_summary: [],
    },
  },
  {
    type: 'parents' as const,
    channel_type: 'parents' as const,
    member_count: 8,
    family_audience_summary: null,
  },
];

describe('normalizeFamilyAudienceSummary', () => {
  it('normalizes a valid partial summary', () => {
    const summary = normalizeFamilyAudienceSummary({
      resolution_source: 'system_class_family',
      student_count: 12,
      guardian_count: 10,
      deliverable_user_count: 7,
      excluded_count: 3,
      delivery_state: 'partial',
      exclusion_summary: [{ code: 'missing_portal_user', count: 3 }],
    });
    expect(summary).toMatchObject({
      student_count: 12,
      guardian_count: 10,
      deliverable_user_count: 7,
      delivery_state: 'partial',
    });
    expect(summary?.exclusion_summary[0]?.code).toBe('missing_portal_user');
  });

  it('returns null for unknown delivery_state or non-objects', () => {
    expect(normalizeFamilyAudienceSummary(null)).toBeNull();
    expect(normalizeFamilyAudienceSummary({ delivery_state: 'weird' })).toBeNull();
    expect(normalizeFamilyAudienceSummary('x')).toBeNull();
  });
});

describe('resolveFamilyPartialHintKey', () => {
  it('maps missing_portal_user to the portal-login hint key', () => {
    expect(
      resolveFamilyPartialHintKey({
        student_count: 10,
        guardian_count: 9,
        deliverable_user_count: 4,
        excluded_count: 5,
        delivery_state: 'partial',
        exclusion_summary: [{ code: 'missing_portal_user', count: 5 }],
      }),
    ).toBe('channels.audience.hints.missingPortalUser');
  });

  it('keeps a generic hint for unknown exclusion codes', () => {
    expect(
      resolveFamilyPartialHintKey({
        student_count: 2,
        guardian_count: 2,
        deliverable_user_count: 1,
        excluded_count: 1,
        delivery_state: 'partial',
        exclusion_summary: [{ code: 'unknown_backend_code', count: 1 }],
      }),
    ).toBe('channels.audience.hints.partialAccounts');
  });
});

describe('buildChannelAudienceViewModel', () => {
  it('never uses member_count for class_family audience', () => {
    const view = buildChannelAudienceViewModel({
      type: 'class_family',
      channel_type: 'class_family',
      member_count: 0,
      family_audience_summary: {
        resolution_source: 'system_class_family',
        student_count: 8,
        guardian_count: 8,
        deliverable_user_count: 5,
        excluded_count: 3,
        delivery_state: 'partial',
        exclusion_summary: [{ code: 'missing_portal_user', count: 3 }],
      },
    });
    expect(view.mode).toBe('family');
    if (view.mode !== 'family') return;
    expect(view.summary?.deliverable_user_count).toBe(5);
    expect(view.badgeKey).toBe('channels.audience.badges.partial');
    expect(view.hintKey).toBe('channels.audience.hints.partialAccounts');
  });

  it('maps ready / unavailable / empty_class states', () => {
    expect(
      (
        buildChannelAudienceViewModel({
          type: 'class_family',
          channel_type: 'class_family',
          member_count: 0,
          family_audience_summary: {
            student_count: 4,
            guardian_count: 4,
            deliverable_user_count: 4,
            excluded_count: 0,
            delivery_state: 'ready',
            exclusion_summary: [],
          },
        }) as { badgeKey?: string }
      ).badgeKey,
    ).toBe('channels.audience.badges.ready');

    const unavailable = buildChannelAudienceViewModel({
      type: 'class_family',
      channel_type: 'class_family',
      member_count: 0,
      family_audience_summary: {
        student_count: 6,
        guardian_count: 6,
        deliverable_user_count: 0,
        excluded_count: 6,
        delivery_state: 'unavailable',
        exclusion_summary: [{ code: 'missing_portal_user', count: 6 }],
      },
    });
    expect(unavailable.mode).toBe('family');
    if (unavailable.mode === 'family') {
      expect(unavailable.summary?.student_count).toBe(6);
      expect(unavailable.hintKey).toBe('channels.audience.hints.noDeliverableAccounts');
    }

    expect(
      (
        buildChannelAudienceViewModel({
          type: 'class_family',
          channel_type: 'class_family',
          member_count: 0,
          family_audience_summary: {
            student_count: 0,
            guardian_count: 0,
            deliverable_user_count: 0,
            excluded_count: 0,
            delivery_state: 'empty_class',
            exclusion_summary: [],
          },
        }) as { badgeKey?: string }
      ).badgeKey,
    ).toBe('channels.audience.badges.emptyClass');
  });

  it('falls back safely when family summary is missing', () => {
    const view = buildChannelAudienceViewModel({
      type: 'class_family',
      channel_type: 'class_family',
      member_count: 0,
      family_audience_summary: null,
    });
    expect(view.mode).toBe('family');
    if (view.mode !== 'family') return;
    expect(view.summary).toBeNull();
    expect(view.badgeKey).toBe('channels.audience.badges.unavailableData');
  });

  it('uses staff members for class_staff and members for manual channels', () => {
    expect(resolveChannelAudienceMode({ type: 'class_staff', channel_type: 'class_staff' })).toBe(
      'staff',
    );
    expect(
      buildChannelAudienceViewModel({
        type: 'class_staff',
        channel_type: 'class_staff',
        member_count: 4,
        family_audience_summary: null,
      }),
    ).toEqual({ mode: 'staff', memberCount: 4 });

    expect(
      buildChannelAudienceViewModel({
        type: 'teachers',
        channel_type: 'teachers',
        member_count: 2,
        family_audience_summary: null,
      }),
    ).toEqual({ mode: 'members', memberCount: 2 });
  });

  it('prefers member_summary.member_count when present', () => {
    expect(
      resolveMemberCount({
        member_count: 9,
        member_summary: { member_count: 3 },
      }),
    ).toBe(3);
  });

  it('covers Ahlen-like empty_class without treating staff as family', () => {
    const family = buildChannelAudienceViewModel(AHLEN_LIKE[0]!);
    const staff = buildChannelAudienceViewModel(AHLEN_LIKE[1]!);
    expect(family.mode).toBe('family');
    if (family.mode === 'family') {
      expect(family.badgeKey).toBe('channels.audience.badges.emptyClass');
      expect(family.summary?.deliverable_user_count).toBe(0);
    }
    expect(staff).toEqual({ mode: 'staff', memberCount: 2 });
  });

  it('covers Nibras-like member_count=0 with deliverable audience', () => {
    const view = buildChannelAudienceViewModel(NIBRAS_LIKE_PARTIAL);
    expect(view.mode).toBe('family');
    if (view.mode !== 'family') return;
    expect(view.summary?.deliverable_user_count).toBe(12);
    expect(view.summary?.excluded_count).toBe(6);
    expect(resolveFamilyPartialHintKey(view.summary)).toBe(
      'channels.audience.hints.missingPortalUser',
    );
  });

  it('covers Alwah-like mixed family and non-family rows', () => {
    const family = buildChannelAudienceViewModel(ALWAH_LIKE_MIXED[0]!);
    const manual = buildChannelAudienceViewModel(ALWAH_LIKE_MIXED[1]!);
    expect(family.mode).toBe('family');
    if (family.mode === 'family') {
      expect(family.badgeKey).toBe('channels.audience.badges.ready');
    }
    expect(manual).toEqual({ mode: 'members', memberCount: 8 });
  });
});
