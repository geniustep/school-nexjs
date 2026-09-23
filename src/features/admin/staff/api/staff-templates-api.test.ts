import { describe, expect, it } from 'vitest';
import {
  normalizeStaffPersonCandidate,
  normalizeStaffPersonCandidates,
} from '@/features/admin/staff/api/staff-templates-api';

describe('staff person candidate normalization', () => {
  it('normalizes an existing multi-role person', () => {
    expect(
      normalizeStaffPersonCandidate({
        partner_id: 42,
        person_id: 42,
        display_name: 'Existing Parent',
        phone: '0612345678',
        email: 'parent@example.com',
        existing_roles: ['guardian', 'teacher'],
        role_labels: ['Parent', 'Teacher'],
        has_user_account: true,
        user_id: 7,
        already_staff_in_school: false,
        can_link_as_staff: true,
      }),
    ).toEqual({
      partner_id: 42,
      person_id: 42,
      user_id: 7,
      teacher_id: null,
      staff_id: null,
      name: 'Existing Parent',
      name_ar: null,
      name_fr: null,
      phone: '0612345678',
      email: 'parent@example.com',
      existing_roles: ['guardian', 'teacher'],
      role_labels: ['Parent', 'Teacher'],
      has_user_account: true,
      already_staff_in_school: false,
      can_link_as_staff: true,
    });
  });

  it('marks a current staff person as unavailable for adoption', () => {
    const [candidate] = normalizeStaffPersonCandidates({
      items: [
        {
          partner_id: 55,
          name: 'Already Staff',
          existing_roles: ['staff'],
          role_labels: ['Staff'],
          has_user_account: true,
          already_staff_in_school: true,
          can_link_as_staff: false,
        },
      ],
    });

    expect(candidate?.already_staff_in_school).toBe(true);
    expect(candidate?.can_link_as_staff).toBe(false);
  });

  it('drops malformed candidates without a usable identity', () => {
    expect(
      normalizeStaffPersonCandidates({
        items: [
          { partner_id: 'bad', name: 'Bad' },
          { partner_id: 2, name: '' },
        ],
      }),
    ).toEqual([]);
  });
});
