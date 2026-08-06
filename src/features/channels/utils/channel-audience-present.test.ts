import { describe, expect, it } from 'vitest';
import {
  buildChannelAudienceViewModel,
  normalizeFamilyAudienceSummary,
  resolveChannelAudienceMode,
  resolveMemberCount,
} from './channel-audience-present';

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
});
