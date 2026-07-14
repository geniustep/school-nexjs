import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  ADMISSIONS_QUERIES_INVALIDATED_EVENT,
  notifyAdmissionsQueriesInvalidated,
} from './admission-list-invalidate';
import { shouldShowConvertToStudentAction } from './admission-modern-actions';
import type { AdmissionListItem } from '@/types/admission';

describe('admissions action invalidation + convert visibility', () => {
  beforeEach(() => {
    const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
    vi.stubGlobal('window', {
      addEventListener: (type: string, fn: (...args: unknown[]) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener: (type: string, fn: (...args: unknown[]) => void) => {
        listeners.get(type)?.delete(fn);
      },
      dispatchEvent: (event: { type: string }) => {
        for (const fn of listeners.get(event.type) ?? []) fn(event);
        return true;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('broadcasts invalidate event after action notify', () => {
    const spy = vi.fn();
    window.addEventListener(ADMISSIONS_QUERIES_INVALIDATED_EVENT, spy);
    notifyAdmissionsQueriesInvalidated({
      reason: 'record_family_approval',
      admissionId: 81,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener(ADMISSIONS_QUERIES_INVALIDATED_EVENT, spy);
  });

  it.each([
    'new',
    'follow_up',
    'in_assessment',
    'decision_pending',
    'accepted',
    'ready_for_registration',
    'waitlisted',
    'rejected',
    'closed',
  ] as const)('shows convert for unregistered status %s when allowed', (status) => {
    const record = {
      application_status: status,
      modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
    } as Pick<
      AdmissionListItem,
      'application_status' | 'modern_allowed_actions'
    >;
    expect(shouldShowConvertToStudentAction(record)).toBe(true);
  });

  it('hides convert for registered', () => {
    expect(
      shouldShowConvertToStudentAction({
        application_status: 'registered',
        modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
        student_id: 10,
      }),
    ).toBe(false);
  });
});
