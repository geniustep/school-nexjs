import { describe, expect, it } from 'vitest';
import {
  filterDisplayPermissionCodes,
  isNoisePermissionCode,
  resolveStaffPermissionLabel,
  resolveStaffCreationTemplateLabel,
  resolveStaffRoleDisplayLabel,
  resolveStaffRoleTemplateChipLabel,
  resolveStaffScopeRoleTemplateLabel,
  resolveStaffTemplateCreateRedirect,
  resolveStaffWarningText,
  resolveTeacherTypeDisplayLabel,
  staffNeedsPasswordSetup,
} from './staff-center-present';
import { mapStaffTemplateCreateError } from './staff-template-utils';
import { mapStaffWarning } from './staff-warnings';
import type { StaffMember } from '@/types/academic-setup';

const t = (key: string) => key;

const tAr = (key: string) => {
  const labels: Record<string, string> = {
    'admin.staffCenter.userType.unknown': 'غير محدد',
    'admin.staffCenter.userType.teacher': 'أستاذ',
    'admin.staffCenter.permissionsModes.assigned': 'صلاحيات معيّنة',
    'admin.staffCenter.warnings.unknown': 'غير محدد',
    'admin.staffCenter.warnings.generic': 'ملاحظة تشغيلية',
    'admin.staffCenter.creationTemplates.subject_teacher': 'أستاذ مادة',
    'admin.staffCenter.creationTemplates.pedagogical_director': 'مدير تربوي',
    'common.dash': '—',
  };
  return labels[key] ?? key;
};

describe('staff-center-present', () => {
  it('resolves pedagogical director creation template label', () => {
    expect(resolveStaffCreationTemplateLabel('pedagogical_director', tAr)).toBe('مدير تربوي');
  });

  it('redirects teacher creates to teacher profile first', () => {
    const redirect = resolveStaffTemplateCreateRedirect(
      { user_id: 4706, teacher_id: 1306 },
      { code: 'subject_teacher', name: 'Teacher', creates_teacher_profile: true },
    );
    expect(redirect.primary).toBe('teacher');
    expect(redirect.teacherId).toBe(1306);
    expect(redirect.userId).toBe(4706);
    expect(`/admin/teachers/${redirect.teacherId}`).toBe('/admin/teachers/1306');
    expect(`/admin/staff/${redirect.userId}`).toBe('/admin/staff/4706');
  });

  it('redirects non-teacher creates to staff profile', () => {
    const redirect = resolveStaffTemplateCreateRedirect(
      { user_id: 99 },
      { code: 'accountant_collections', name: 'Accountant' },
    );
    expect(redirect.primary).toBe('staff');
    expect(redirect.userId).toBe(99);
  });

  it('filters noise permission codes', () => {
    expect(isNoisePermissionCode('assigned')).toBe(true);
    expect(isNoisePermissionCode('unknown')).toBe(true);
    expect(filterDisplayPermissionCodes(['assigned', 'view_attendance', 'unknown'])).toEqual([
      'view_attendance',
    ]);
  });

  it('resolves role display from role_display_name', () => {
    const label = resolveStaffRoleDisplayLabel(
      {
        role_display_name: 'أستاذ مادة',
        admin_kind: 'registration_officer' as StaffMember['admin_kind'],
        creation_template_code: 'subject_teacher',
      },
      t,
    );
    expect(label).toBe('أستاذ مادة');
  });

  it('detects password setup needed from warnings', () => {
    const member = {
      warnings: [{ code: 'password_not_set' }],
    } as StaffMember;
    expect(staffNeedsPasswordSetup(member)).toBe(true);
  });

  it('resolves permission labels for known codes', () => {
    const label = resolveStaffPermissionLabel('view_attendance', 'ar', t);
    expect(label).toBeTruthy();
    expect(label).not.toBe('assigned');
    expect(label).not.toBe('unknown');
  });

  it('does not leak raw unknown warning code or message', () => {
    expect(mapStaffWarning({ code: 'unknown', message: 'unknown' }, tAr)).toBe('غير محدد');
    expect(resolveStaffWarningText({ code: 'unknown' }, tAr)).toBe('غير محدد');
    expect(resolveStaffWarningText({ message: 'unknown' }, tAr)).toBe('غير محدد');
    expect(mapStaffWarning({ code: 'unknown', message: 'unknown' }, tAr)).not.toBe('unknown');
  });

  it('does not leak raw assigned warning token', () => {
    expect(mapStaffWarning({ code: 'assigned', message: 'assigned' }, tAr)).toBe('صلاحيات معيّنة');
    expect(mapStaffWarning({ code: 'assigned', message: 'assigned' }, tAr)).not.toBe('assigned');
  });

  it('uses role_display_name instead of registration_officer for teacher chips', () => {
    const member = {
      role_display_name: 'أستاذ مادة',
      admin_kind: 'registration_officer' as StaffMember['admin_kind'],
      creation_template_code: 'subject_teacher',
      teacher_id: 1306,
      is_teacher: true,
    };
    expect(resolveStaffRoleTemplateChipLabel('registration_officer', member, tAr)).toBe('أستاذ مادة');
    expect(resolveStaffRoleTemplateChipLabel('registration_officer', member, tAr)).not.toBe(
      'registration_officer',
    );
    expect(
      resolveStaffScopeRoleTemplateLabel(
        { role_template_code: 'registration_officer' },
        member,
        tAr,
      ),
    ).toBe('أستاذ مادة');
    expect(
      resolveStaffScopeRoleTemplateLabel(
        { role_template_name: 'مسؤول تسجيل', role_template_code: 'registration_officer' },
        member,
        tAr,
      ),
    ).toBe('أستاذ مادة');
  });

  it('maps teacher_type unknown to role_display_name on staff detail', () => {
    const member = {
      role_display_name: 'أستاذ مادة',
      admin_kind: 'registration_officer' as StaffMember['admin_kind'],
      creation_template_code: 'subject_teacher',
      teacher_type: 'unknown',
      teacher_id: 1306,
    };
    expect(resolveTeacherTypeDisplayLabel(member, 'unknown', tAr)).toBe('أستاذ مادة');
    expect(resolveTeacherTypeDisplayLabel(member, 'unknown', tAr)).not.toBe('unknown');
  });
});

describe('mapStaffTemplateCreateError', () => {
  const tWithLabels = (key: string) => {
    const labels: Record<string, string> = {
      'admin.staffCenter.smartCreate.errors.passwordRequiredBeforeCreate':
        'يرجى تعيين كلمة مرور لحساب الموظف قبل الإنشاء.',
      'admin.academicSetup.staffPassword.errors.passwordMismatch':
        'كلمة المرور وتأكيدها غير متطابقين.',
      'errors.serverError': 'حدث خطأ',
    };
    return labels[key] ?? key;
  };

  it('maps password_required without leaking raw code', () => {
    const msg = mapStaffTemplateCreateError(
      { code: 'password_required', message: 'password_required' },
      tWithLabels,
    );
    expect(msg).toBe('يرجى تعيين كلمة مرور لحساب الموظف قبل الإنشاء.');
    expect(msg).not.toContain('password_required');
  });

  it('maps password_mismatch to friendly message', () => {
    expect(mapStaffTemplateCreateError({ code: 'password_mismatch', message: '' }, tWithLabels)).toBe(
      'كلمة المرور وتأكيدها غير متطابقين.',
    );
  });
});
