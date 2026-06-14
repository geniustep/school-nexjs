import { describe, expect, it } from 'vitest';
import { normalizeStudentDetailsResponse } from './normalize-student-details';

describe('normalizeStudentDetailsResponse', () => {
  it('parses nested Student 360 payload', () => {
    const data = normalizeStudentDetailsResponse({
      student: {
        id: 617,
        status: 'active',
        level: { id: 1, name: 'M1', code: 'M1', display_alias: 'M1 — test' },
      },
      current_enrollment: { id: 1, state: 'active', is_current: true },
      enrollment_history: [{ id: 1, state: 'active' }],
      guardian_relationships: [
        {
          relationship_id: 10,
          guardian: { id: 5, name: 'Parent' },
          relationship_type: 'father',
          is_primary_contact: true,
          is_legal_guardian: true,
          is_financial_responsible: false,
          receives_notifications: true,
          is_emergency_contact: false,
          is_authorized_pickup: false,
          state: 'active',
        },
      ],
      capabilities: {
        can_manage: true,
        can_manage_guardians: true,
        can_view_finance: false,
      },
    });

    expect(data?.student.id).toBe(617);
    expect(data?.current_enrollment?.is_current).toBe(true);
    expect(data?.guardian_relationships).toHaveLength(1);
    expect(data?.capabilities.can_manage_guardians).toBe(true);
  });

  it('handles null current enrollment', () => {
    const data = normalizeStudentDetailsResponse({
      student: { id: 1, status: 'active' },
      current_enrollment: null,
      enrollment_history: [],
      guardian_relationships: [],
      capabilities: { can_manage: false, can_manage_guardians: false, can_view_finance: false },
    });
    expect(data?.current_enrollment).toBeNull();
  });

  it('maps legacy flat student', () => {
    const data = normalizeStudentDetailsResponse({
      id: 3,
      status: 'active',
      first_name: 'Ali',
      parents: [{ id: 9, name: 'Parent', phone: '0600' }],
    });
    expect(data?.student.first_name).toBe('Ali');
    expect(data?.guardian_relationships[0].guardian.id).toBe(9);
  });
});
