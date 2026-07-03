import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n/messages';
import {
  formatStaffFilterStats,
  formatStaffRoleLine,
  resolveStaffAdminKindLabel,
  translateTechnicalJobTitle,
} from './staff-present';
import type { StaffMember } from '@/types/academic-setup';

const tAr = (key: string, params?: Record<string, string | number>) => translate('ar', key, params);
const tEn = (key: string, params?: Record<string, string | number>) => translate('en', key, params);

function member(partial: Partial<StaffMember> & Pick<StaffMember, 'id' | 'name'>): StaffMember {
  return {
    email: null,
    phone: null,
    job_title: null,
    admin_kind: 'admin_staff',
    active: true,
    account_status: 'active',
    schools: [],
    default_school: null,
    permissions: [],
    ...partial,
  };
}

describe('resolveStaffAdminKindLabel', () => {
  it('translates known admin kinds', () => {
    expect(resolveStaffAdminKindLabel('admin_staff', tAr)).toBe('موظف إداري');
    expect(resolveStaffAdminKindLabel('school_manager', tAr)).toBe('مدير مدرسة');
    expect(resolveStaffAdminKindLabel('pedagogical_director', tAr)).toBe('مدير تربوي');
    expect(resolveStaffAdminKindLabel('pedagogical_director', tEn)).toBe('Pedagogical Director');
  });

  it('maps legacy administrator label to translated role', () => {
    expect(resolveStaffAdminKindLabel('administrator', tAr)).toBe('مدير المؤسسة');
    expect(translateTechnicalJobTitle('Administrator', tEn)).toBe('School manager');
  });
});

describe('formatStaffRoleLine', () => {
  it('shows admin kind and distinct job title', () => {
    expect(
      formatStaffRoleLine(
        member({ id: 1, name: 'A', admin_kind: 'admin_staff', job_title: 'الاستقبال' }),
        tAr,
      ),
    ).toBe('موظف إداري · الاستقبال');
  });

  it('does not repeat administrator english job title', () => {
    expect(
      formatStaffRoleLine(
        member({ id: 2, name: 'B', admin_kind: 'school_manager', job_title: 'Administrator' }),
        tAr,
      ),
    ).toBe('مدير مدرسة');
  });

  it('does not duplicate admin kind line', () => {
    expect(
      formatStaffRoleLine(
        member({ id: 3, name: 'C', admin_kind: 'admin_staff', job_title: 'Admin Staff' }),
        tEn,
      ),
    ).toBe('Administrative staff');
  });
});

describe('formatStaffFilterStats', () => {
  it('uses filter-specific plural labels in Arabic', () => {
    expect(formatStaffFilterStats(tAr, 'ar', 'active', 3)).toBe('3 موظفين نشطين');
    expect(formatStaffFilterStats(tAr, 'ar', 'inactive', 2)).toBe('موظفان معطّلان');
    expect(formatStaffFilterStats(tAr, 'ar', 'all', 5)).toBe('5 موظفين');
  });

  it('returns zero label when count is 0', () => {
    expect(formatStaffFilterStats(tAr, 'ar', 'inactive', 0)).toBe('لا توجد حسابات معطّلة');
  });
});
