import { describe, expect, it } from 'vitest';
import {
  buildGuardianCardSchoolBadges,
  buildPersonSchoolIdentityBadges,
  personHasLoginAccount,
  personHasStaffRole,
  resolveTeacherBadgeLabel,
} from './person-school-identity';

const t = (key: string) => key;

describe('person-school-identity', () => {
  it('maps teacher, staff, guardian history, login, and linked children', () => {
    const badges = buildPersonSchoolIdentityBadges(t, {
      existing_roles: ['teacher', 'guardian'],
      role_labels: ['أستاذة', 'ولي أمر'],
      teacher_id: 1278,
      staff_id: null,
      guardian_id: 701,
      guardian_links_count: 2,
      has_user: true,
      user_id: 4558,
    });

    expect(badges.map((badge) => badge.id)).toEqual([
      'teacher',
      'former-guardian',
      'linked-children',
      'login',
    ]);
    expect(badges[0]?.label).toBe('أستاذة');
    expect(badges[3]?.label).toBe('admin.student360.schoolRoleHasLoginAccount');
  });

  it('uses staff role codes and staff_id', () => {
    expect(personHasStaffRole({ staff_id: 12 })).toBe(true);
    expect(personHasStaffRole({ existing_roles: ['school_manager'] })).toBe(true);
    expect(
      buildPersonSchoolIdentityBadges(t, { existing_roles: ['admin_staff'] }).some((badge) => badge.id === 'staff'),
    ).toBe(true);
  });

  it('detects login account from alternate API fields', () => {
    expect(personHasLoginAccount({ has_user_account: true })).toBe(true);
    expect(personHasLoginAccount({ has_account: true })).toBe(true);
    expect(personHasLoginAccount({ user_id: 10 })).toBe(true);
    expect(personHasLoginAccount({ has_user: true })).toBe(true);
  });

  it('falls back to generic teacher label when role_labels are missing', () => {
    expect(resolveTeacherBadgeLabel(t, { existing_roles: ['teacher'], teacher_id: 1 })).toBe(
      'admin.student360.schoolRoleTeacher',
    );
  });

  it('returns empty-state badges list when no known roles exist', () => {
    expect(buildPersonSchoolIdentityBadges(t, {})).toEqual([]);
  });

  it('prefers role_labels on guardian cards and skips prior-guardian hints', () => {
    const badges = buildGuardianCardSchoolBadges(t, {
      role_labels: ['أستاذة', 'ولي أمر'],
      has_user_account: true,
      guardian_id: 701,
      guardian_links_count: 2,
    });

    expect(badges.map((badge) => badge.label)).toEqual([
      'أستاذة',
      'admin.student360.schoolRoleHasLoginAccount',
    ]);
  });
});
