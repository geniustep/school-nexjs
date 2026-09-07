import { describe, expect, it } from 'vitest';
import type { StudentOverviewData } from '@/types/student-overview';
import { resolveOverviewEditAccess } from './resolve-overview-allowed-actions';

function overviewWithEditAction(editStudent?: boolean): StudentOverviewData {
  return {
    available: true,
    allowed_actions:
      editStudent === undefined ? {} : { edit_student: editStudent },
  } as StudentOverviewData;
}

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

  it('allows editing only when the backend explicitly allows edit_student', () => {
    expect(
      resolveOverviewEditAccess(overviewWithEditAction(true), {
        loading: false,
        hasError: false,
        endpointUnavailable: false,
      }),
    ).toBe('allowed');
  });

  it('preserves an explicit backend denial', () => {
    expect(
      resolveOverviewEditAccess(overviewWithEditAction(false), {
        loading: false,
        hasError: false,
        endpointUnavailable: false,
      }),
    ).toBe('denied');
  });

  it('fails closed when the backend decision is missing or unavailable', () => {
    expect(
      resolveOverviewEditAccess(overviewWithEditAction(), {
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
});
