import { describe, expect, it } from 'vitest';
import {
  admissionAllowsSafeDelete,
  mapAdmissionSafeDeleteError,
  normalizeAdmissionCanDelete,
  normalizeAdmissionDeleteBlockReason,
} from './admission-safe-delete';
import { normalizeAdmissionDetail, normalizeAdmissionListItem } from './normalize-admission-record';
import type { AdmissionDetail, AdmissionListItem } from '@/types/admission';

function baseList(partial: Partial<AdmissionListItem> & { id: number }): AdmissionListItem {
  return {
    student_name: 'تلميذ',
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'new',
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    assigned_user: null,
    priority: null,
    ...partial,
  };
}

describe('admission safe delete contract parsing', () => {
  it('parses can_delete true/false and fail-closed when absent', () => {
    expect(normalizeAdmissionCanDelete(true)).toBe(true);
    expect(normalizeAdmissionCanDelete(false)).toBe(false);
    expect(normalizeAdmissionCanDelete(undefined)).toBe(false);
    expect(normalizeAdmissionCanDelete(null)).toBe(false);
    expect(normalizeAdmissionCanDelete('true')).toBe(false);
    expect(normalizeAdmissionCanDelete(1)).toBe(false);
  });

  it('normalizes delete_block_reason', () => {
    expect(normalizeAdmissionDeleteBlockReason(false)).toBe(false);
    expect(normalizeAdmissionDeleteBlockReason('linked_student')).toBe('linked_student');
    expect(normalizeAdmissionDeleteBlockReason('  ')).toBe(false);
    expect(normalizeAdmissionDeleteBlockReason(null)).toBe(false);
  });

  it('fail-closed on list normalize when field missing', () => {
    const item = normalizeAdmissionListItem(baseList({ id: 1, application_status: 'new' }));
    expect(item.can_delete).toBe(false);
    expect(item.delete_block_reason).toBe(false);
  });

  it('keeps can_delete true from detail payload', () => {
    const detail = normalizeAdmissionDetail({
      id: 62,
      student_name: 'أحمد',
      state: 'new',
      allowed_actions: {},
      can_delete: true,
      delete_block_reason: false,
    } as AdmissionDetail);
    expect(detail.can_delete).toBe(true);
    expect(admissionAllowsSafeDelete(detail)).toBe(true);
  });

  it('does not allow action from status or student_id alone', () => {
    const item = normalizeAdmissionListItem(
      baseList({
        id: 9,
        application_status: 'new',
        student_id: false,
        can_delete: false,
      }),
    );
    expect(admissionAllowsSafeDelete(item)).toBe(false);
  });
});

describe('mapAdmissionSafeDeleteError', () => {
  it('maps 403 / forbidden', () => {
    expect(mapAdmissionSafeDeleteError({ code: 'forbidden', status: 403 }).messageKey).toBe(
      'admin.admissions.safeDelete.forbidden',
    );
  });

  it('maps 404 / not_found', () => {
    expect(mapAdmissionSafeDeleteError({ code: 'not_found', status: 404 }).kind).toBe('not_found');
  });

  it('maps 409 admission_delete_not_allowed', () => {
    const mapped = mapAdmissionSafeDeleteError({
      code: 'admission_delete_not_allowed',
      status: 409,
      details: { reason: 'has_student' },
    });
    expect(mapped.kind).toBe('not_allowed');
    expect(mapped.reason).toBe('has_student');
    expect(mapped.messageKey).toBe('admin.admissions.safeDelete.notAllowed');
  });
});
