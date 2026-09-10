import { describe, expect, it } from 'vitest';
import type { StudentCapabilities } from '@/types/student-360';
import type { StudentOverviewData } from '@/types/student-overview';
import { normalizeStudentOverviewResponse } from './normalize-student-overview';
import {
  resolveOverviewEditAccess,
  resolveOverviewEditAllowed,
} from './resolve-overview-allowed-actions';

function overviewWithActions(actions?: string[]): StudentOverviewData {
  return {
    available: true,
    ...(actions === undefined ? {} : { allowed_actions: actions }),
  };
}

const fullManageCaps: StudentCapabilities = {
  can_manage: true,
  can_manage_guardians: true,
  can_view_finance: true,
};

describe('resolveOverviewEditAccess', () => {
  it('keeps the edit form pending while the authoritative overview decision is loading', () => {
    expect(
      resolveOverviewEditAccess(null, {
        loading: true,
        hasError: false,
        endpointUnavailable: false,
      }),
    ).toBe('pending');

    expect(
      resolveOverviewEditAccess(null, {
        loading: false,
        hasError: false,
        endpointUnavailable: false,
      }),
    ).toBe('pending');
  });

  it('allows editing only when the backend action list contains edit', () => {
    expect(
      resolveOverviewEditAccess(overviewWithActions(['view', 'edit']), {
        loading: false,
        hasError: false,
        endpointUnavailable: false,
      }),
    ).toBe('allowed');
  });

  it('denies editing for a valid action list without edit', () => {
    expect(
      resolveOverviewEditAccess(overviewWithActions(['view']), {
        loading: false,
        hasError: false,
        endpointUnavailable: false,
      }),
    ).toBe('denied');

    expect(
      resolveOverviewEditAccess(overviewWithActions([]), {
        loading: false,
        hasError: false,
        endpointUnavailable: false,
      }),
    ).toBe('denied');
  });

  it('does not treat the legacy edit_student action as edit authority', () => {
    expect(
      resolveOverviewEditAccess(overviewWithActions(['view', 'edit_student']), {
        loading: false,
        hasError: false,
        endpointUnavailable: false,
      }),
    ).toBe('denied');
  });

  it('fails closed when the backend decision is missing or unavailable', () => {
    expect(
      resolveOverviewEditAccess(overviewWithActions(), {
        loading: false,
        hasError: false,
        endpointUnavailable: false,
      }),
    ).toBe('unavailable');

    expect(
      resolveOverviewEditAccess(null, {
        loading: false,
        hasError: true,
        endpointUnavailable: false,
      }),
    ).toBe('unavailable');

    expect(
      resolveOverviewEditAccess(null, {
        loading: false,
        hasError: false,
        endpointUnavailable: true,
      }),
    ).toBe('unavailable');
  });

  it('does not fall back to local can_manage capability for full edit authority', () => {
    expect(resolveOverviewEditAllowed(overviewWithActions(['view']), fullManageCaps)).toBe(false);
    expect(resolveOverviewEditAllowed(overviewWithActions(), fullManageCaps)).toBe(false);
    expect(resolveOverviewEditAllowed(overviewWithActions(['view', 'edit']), fullManageCaps)).toBe(true);
  });
});

describe('normalizeStudentOverviewResponse allowed_actions', () => {
  it('preserves the authoritative string action list including future actions', () => {
    expect(
      normalizeStudentOverviewResponse({
        available: true,
        allowed_actions: ['view', 'edit', 'future_action'],
      })?.allowed_actions,
    ).toEqual(['view', 'edit', 'future_action']);
  });

  it('preserves an empty authoritative action list', () => {
    expect(
      normalizeStudentOverviewResponse({ available: true, allowed_actions: [] })?.allowed_actions,
    ).toEqual([]);
  });

  it('rejects legacy boolean-object action contracts', () => {
    expect(
      normalizeStudentOverviewResponse({
        available: true,
        allowed_actions: { edit_student: true },
      })?.allowed_actions,
    ).toBeUndefined();

    expect(
      normalizeStudentOverviewResponse({
        available: true,
        allowed_actions: { edit: true },
      })?.allowed_actions,
    ).toBeUndefined();
  });

  it('rejects mixed malformed arrays instead of retaining edit authority', () => {
    expect(
      normalizeStudentOverviewResponse({
        available: true,
        allowed_actions: ['view', 'edit', true],
      })?.allowed_actions,
    ).toBeUndefined();
  });

  it('rejects malformed action strings instead of normalizing them into authority', () => {
    expect(
      normalizeStudentOverviewResponse({
        available: true,
        allowed_actions: ['view', ' edit '],
      })?.allowed_actions,
    ).toBeUndefined();
  });
});
