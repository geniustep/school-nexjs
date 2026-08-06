// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    if (!params) return key;
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
      key,
    );
  },
}));

import { ChannelAudienceSummary } from './channel-audience-summary';

afterEach(() => cleanup());

describe('ChannelAudienceSummary', () => {
  it('shows family audience for class_family with member_count 0 and partial state', () => {
    render(
      <ChannelAudienceSummary
        channel={{
          type: 'class_family',
          channel_type: 'class_family',
          member_count: 0,
          family_audience_summary: {
            student_count: 10,
            guardian_count: 9,
            deliverable_user_count: 4,
            excluded_count: 5,
            delivery_state: 'partial',
            exclusion_summary: [{ code: 'missing_portal_user', count: 5 }],
          },
        }}
      />,
    );
    expect(screen.getByTestId('channel-audience-family')).toBeTruthy();
    expect(screen.getByText('channels.audience.badges.partial')).toBeTruthy();
    expect(screen.getByText('channels.audience.audienceCounts')).toBeTruthy();
    expect(screen.getByText('channels.audience.deliverableAccounts')).toBeTruthy();
    expect(screen.getByText('channels.audience.excludedCount')).toBeTruthy();
    expect(screen.getByText('channels.audience.hints.missingPortalUser')).toBeTruthy();
    expect(screen.queryByText(/0 members|الأعضاء: 0|0 عضو/i)).toBeNull();
    expect(screen.queryByText('missing_portal_user')).toBeNull();
  });

  it('shows ready deliverable count without excluded line', () => {
    render(
      <ChannelAudienceSummary
        channel={{
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
        }}
      />,
    );
    expect(screen.getByTestId('channel-audience-family').getAttribute('data-delivery-state')).toBe(
      'ready',
    );
    expect(screen.getByText('channels.audience.badges.ready')).toBeTruthy();
    expect(screen.queryByText('channels.audience.excludedCount')).toBeNull();
  });

  it('falls back without using member_count when summary is absent', () => {
    render(
      <ChannelAudienceSummary
        channel={{
          type: 'class_family',
          channel_type: 'class_family',
          member_count: 0,
          family_audience_summary: null,
        }}
      />,
    );
    expect(screen.getByTestId('channel-audience-family-fallback')).toBeTruthy();
    expect(screen.getByText('channels.audience.unavailableData')).toBeTruthy();
  });

  it('shows staff members for class_staff and members for manual channels', () => {
    const { rerender } = render(
      <ChannelAudienceSummary
        channel={{
          type: 'class_staff',
          channel_type: 'class_staff',
          member_count: 3,
          family_audience_summary: null,
        }}
      />,
    );
    expect(screen.getByTestId('channel-audience-staff').textContent).toContain(
      'channels.audience.staffMembers',
    );

    rerender(
      <ChannelAudienceSummary
        channel={{
          type: 'teachers',
          channel_type: 'teachers',
          member_count: 2,
          family_audience_summary: null,
        }}
      />,
    );
    expect(screen.getByTestId('channel-audience-members')).toBeTruthy();
  });

  it('treats null non-family summary without error', () => {
    render(
      <ChannelAudienceSummary
        channel={{
          type: 'parents',
          channel_type: 'parents',
          member_count: 5,
          family_audience_summary: null,
        }}
      />,
    );
    expect(screen.getByTestId('channel-audience-members')).toBeTruthy();
  });

  it('uses channel_type over divergent type for family audience', () => {
    render(
      <ChannelAudienceSummary
        channel={{
          type: 'teachers',
          channel_type: 'class_family',
          member_count: 99,
          family_audience_summary: {
            student_count: 1,
            guardian_count: 1,
            deliverable_user_count: 1,
            excluded_count: 0,
            delivery_state: 'ready',
            exclusion_summary: [],
          },
        }}
      />,
    );
    expect(screen.getByTestId('channel-audience-family')).toBeTruthy();
    expect(screen.queryByTestId('channel-audience-members')).toBeNull();
  });

  it('supports legacy type-only class_family payload', () => {
    render(
      <ChannelAudienceSummary
        channel={{
          type: 'class_family',
          member_count: 0,
          family_audience_summary: null,
        }}
      />,
    );
    expect(screen.getByTestId('channel-audience-family-fallback')).toBeTruthy();
  });
});
