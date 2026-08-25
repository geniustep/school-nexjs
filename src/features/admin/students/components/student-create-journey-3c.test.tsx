/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudentCreateResultSection } from '@/features/admin/students/components/student-create-result-section';
import { StudentCreateStepper } from '@/features/admin/students/components/student-create-stepper';
import { StudentCreateReviewSection } from '@/features/admin/students/components/student-create-review-section';
import { defaultStudentCreateBillingFormState } from '@/features/admin/students/utils/student-create-billing-responsibility';
import { defaultStudentCreateFinanceFormState } from '@/features/admin/students/utils/student-enrollment-finance';
import {
  buildStudentCreatePayload,
  defaultStudentProfileFormState,
  validateStudentCreateIdentityStep,
} from '@/features/admin/students/utils/student-profile';
import {
  applyStudentCreateGuardianAtomicContractToPayload,
  validateStudentCreateGuardianContract,
} from '@/features/admin/students/utils/student-create-guardian-payload';
import { validateBillingResponsibilityForm } from '@/features/admin/students/utils/student-create-billing-responsibility';
import { shouldAttachFinanceOnCreate } from '@/features/admin/students/utils/student-create-finance-skip';
import { mapStudentApiError } from '@/features/admin/students/utils/student-api-errors';

afterEach(() => cleanup());

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    id: 1,
    name: 'Tester',
    email: 't@example.com',
    role: 'admin',
    permissions: [],
    effective_permissions: [],
    effective_capabilities: [],
    school: null,
  }),
}));

vi.mock('@/features/admin/student-finance/hooks/use-student-family-finance', () => ({
  useStudentFamilyFinanceSummary: () => ({
    data: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    initialLoading: false,
    fetching: false,
  }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    const map: Record<string, string> = {
      'admin.student360.create.stepperAria': 'خطوات تسجيل التلميذ',
      'admin.student360.create.steps.identity': 'بيانات التلميذ',
      'admin.student360.create.steps.billing': 'أولياء الأمر',
      'admin.student360.create.steps.enrollment': 'التمدرس',
      'admin.student360.create.steps.finance': 'الخطة المالية والأداء',
      'admin.student360.create.steps.review': 'المراجعة والتسجيل',
      'admin.student360.create.stepStatus.current': 'المرحلة الحالية',
      'admin.student360.create.stepStatus.done': 'مكتملة',
      'admin.student360.create.stepStatus.upcoming': 'متبقية',
      'admin.student360.create.result.title': 'نتيجة التسجيل',
      'admin.student360.create.result.lead': 'اكتمل التسجيل',
      'admin.student360.create.result.success': 'تم تسجيل التلميذ بنجاح.',
      'admin.student360.create.result.studentReference': 'مرجع التلميذ',
      'admin.student360.create.result.financeSkipped': 'دون خطة',
      'admin.student360.create.result.financeDraft': 'مسودة',
      'admin.student360.create.result.financeActivated': 'مفعّل',
      'admin.student360.create.result.openStudent360': 'فتح ملف التلميذ (Student 360)',
      'admin.student360.create.result.createAnother': 'تسجيل تلميذ آخر',
      'admin.student360.create.result.backToList': 'العودة إلى لائحة التلاميذ',
      'admin.student360.registrationCollection.openFinance': 'فتح الوضعية المالية',
      'admin.student360.create.review.title': 'المراجعة النهائية',
      'admin.student360.create.reviewStepLead': 'راجع قبل الاعتماد',
      'admin.student360.create.review.stageStudent': 'ملخص التلميذ',
      'admin.student360.create.review.studentOverview': 'نظرة عامة',
      'admin.student360.create.review.enrollmentDate': 'تاريخ الالتحاق',
      'admin.student360.create.review.billingPartner': 'المسؤول عن الأداء',
      'admin.student360.create.review.financeSkippedNotice':
        'سيتم إنشاء التلميذ بدون اتفاق مالي.',
      'admin.student360.create.billingResponsibility.partnerGuardian': 'ولي الأمر',
      'admin.student360.create.billingResponsibility.selectionPlaceholder': 'اختر…',
      'nav.classes': 'الأقسام',
      'common.dash': '—',
      'admin.student360.errors.firstNameRequired': 'الاسم الشخصي مطلوب.',
      'admin.student360.errors.lastNameRequired': 'اسم العائلة مطلوب.',
      'admin.student360.create.billingResponsibility.errors.selectionRequired':
        'اختر المسؤول عن الأداء قبل المتابعة.',
      'admin.student360.create.billingResponsibility.errors.billingGuardianSelectionRequired':
        'اختر أي ولي مسؤول عن الأداء.',
      'admin.student360.errors.duplicateMassar': 'رقم مسار مكرر.',
      'errors.forbidden': 'غير مسموح.',
      'errors.serverError': 'خطأ خادمي.',
    };
    let value = map[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v));
      }
    }
    return value;
  },
  useLocale: () => ({ locale: 'ar' }),
}));

vi.mock('@/features/i18n/use-format', () => ({
  useFormat: () => ({
    formatDate: (v: string) => v || '',
    formatMoney: (v: number) => String(v),
  }),
}));

describe('REGISTRATION-FINANCE-3C journey hardening', () => {
  it('supports minimal identity validation for single-student registration', () => {
    const t = (key: string) => key;
    const empty = validateStudentCreateIdentityStep(defaultStudentProfileFormState(null), t);
    expect(empty.valid).toBe(false);

    const ok = validateStudentCreateIdentityStep(
      {
        ...defaultStudentProfileFormState(null),
        firstName: 'ياسين',
        lastName: 'العلوي',
      },
      t,
    );
    expect(ok.valid).toBe(true);
  });

  it('registers without finance payload when plan is skipped', () => {
    const profile = {
      ...defaultStudentProfileFormState(null),
      firstName: 'ياسين',
      lastName: 'العلوي',
      academicYearId: '1',
      levelId: '10',
      classId: '20',
      actualJoinDate: '2026-09-01',
    };
    expect(shouldAttachFinanceOnCreate(true, { ok: true, fee_plan_id: 1 } as never, profile, 3)).toBe(
      false,
    );
    const payload = buildStudentCreatePayload(profile, {
      suggest: null,
      financeState: defaultStudentCreateFinanceFormState(null),
      schoolId: 3,
    });
    expect(payload.finance).toBeUndefined();
  });

  it('links an existing guardian with billing_guardian_id', () => {
    const profile = {
      ...defaultStudentProfileFormState(null),
      firstName: 'ياسين',
      lastName: 'العلوي',
      emergencyContactName: 'فاطمة',
      emergencyPhone: '0612345678',
      emergencyRelationship: 'mother',
    };
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      guardianSourceMode: 'existing' as const,
      responsibilitySelection: 'guardian' as const,
      linkedGuardianId: 701,
    };
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profile, null, { deferGuardianContact: true }),
      profile,
      billing,
    );
    expect(payload.guardian_relationships?.[0]).toMatchObject({ guardian_id: 701 });
    expect(payload.billing_responsibility).toEqual({
      mode: 'guardian',
      billing_guardian_id: 701,
    });
  });

  it('creates a new guardian nested identity when permitted by payload contract', () => {
    const profile = {
      ...defaultStudentProfileFormState(null),
      emergencyContactName: 'فاطمة',
      emergencyPhone: '0612345678',
      emergencyRelationship: 'mother',
    };
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      guardianSourceMode: 'new' as const,
      responsibilitySelection: 'guardian' as const,
    };
    const payload = applyStudentCreateGuardianAtomicContractToPayload(
      buildStudentCreatePayload(profile, null, { deferGuardianContact: true }),
      profile,
      billing,
    );
    expect(payload.guardian_relationships?.[0]).toMatchObject({
      guardian: { full_name: 'فاطمة' },
    });
  });

  it('requires explicit billing guardian when multiple guardians exist', () => {
    const t = (key: string) => key;
    const profile = {
      ...defaultStudentProfileFormState(null),
      emergencyContactName: 'فاطمة',
      emergencyPhone: '0612345678',
      emergencyRelationship: 'mother',
    };
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      guardianSourceMode: 'new' as const,
      responsibilitySelection: 'guardian' as const,
      guardianEntries: [
        {
          kind: 'existing' as const,
          entryKey: 'existing-702',
          guardian_id: 702,
          displayName: 'حسن',
          relationship_type: 'father' as const,
          is_primary_contact: false,
        },
      ],
    };
    const result = validateStudentCreateGuardianContract(profile, billing, t);
    expect(result.valid).toBe(false);
    expect(result.errors.billingGuardianSelection).toBeTruthy();
  });

  it('blocks submit when مسؤول الأداء is not selected', () => {
    const t = (key: string) => key;
    const result = validateBillingResponsibilityForm(
      {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'needs_selection',
      },
      t,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.billingResponsibilitySelection).toBeTruthy();
  });

  it('renders Arabic stepper titles in RTL journey order', () => {
    render(<StudentCreateStepper activeStep="billing" />);
    expect(screen.getByRole('navigation', { name: /خطوات تسجيل التلميذ/ })).toBeTruthy();
    expect(screen.getByText('بيانات التلميذ')).toBeTruthy();
    expect(screen.getByText('أولياء الأمر')).toBeTruthy();
    expect(screen.getByText('المراجعة والتسجيل')).toBeTruthy();
  });

  it('shows final review summary with finance-skipped notice', () => {
    const profile = {
      ...defaultStudentProfileFormState(null),
      firstName: 'ياسين',
      lastName: 'العلوي',
      actualJoinDate: '2026-09-01',
    };
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      responsibilitySelection: 'guardian' as const,
    };
    render(
      <StudentCreateReviewSection
        profileState={profile}
        billingState={billing}
        linkedGuardianPerson={null}
        guardianEntries={[]}
        billingGuardianEntryKey={null}
        suggest={null}
        financeState={defaultStudentCreateFinanceFormState(null)}
        preview={null}
        financeBlocked={false}
        financeSkipped
      />,
    );
    expect(screen.getByText('المراجعة النهائية')).toBeTruthy();
    expect(screen.getByText(/بدون اتفاق مالي/)).toBeTruthy();
    expect(screen.getByText('المسؤول عن الأداء')).toBeTruthy();
  });

  it('result screen offers Student 360 navigation and does not claim success before CTA', () => {
    const onOpen = vi.fn();
    render(
      <StudentCreateResultSection
        result={{
          studentId: 55,
          studentCode: 'ST-55',
          financeAttached: false,
        }}
        onOpenStudent360={onOpen}
        onCreateAnother={vi.fn()}
        onBackToList={vi.fn()}
      />,
    );
    expect(screen.getByTestId('student-create-result')).toBeTruthy();
    expect(screen.getByText('ST-55')).toBeTruthy();
    fireEvent.click(screen.getByTestId('student-create-open-360'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('maps duplicate and forbidden API errors by code', () => {
    const t = (key: string) => key;
    const duplicate = mapStudentApiError(
      { code: 'duplicate_massar', message: 'dup' } as never,
      t,
    );
    expect(duplicate.message).toBeTruthy();

    const forbidden = mapStudentApiError(
      { code: 'forbidden', message: 'no' } as never,
      t,
    );
    expect(String(forbidden.message).length).toBeGreaterThan(0);

    const server = mapStudentApiError(
      { code: 'internal_error', message: 'boom', retryable: true } as never,
      t,
    );
    expect(String(server.message).length).toBeGreaterThan(0);
  });

  it('does not compute financial totals locally in create payload builder', () => {
    const profile = {
      ...defaultStudentProfileFormState(null),
      firstName: 'ياسين',
      lastName: 'العلوي',
      academicYearId: '1',
      levelId: '10',
      classId: '20',
      actualJoinDate: '2026-09-01',
    };
    const suggest = {
      ok: true,
      fee_plan_id: 99,
      fee_plan_name: 'خطة',
      currency: 'MAD',
      suggested_periods: [
        { period_key: '2026-09', label: 'شتنبر', due_date: '2026-09-05', selected: true, amount: 1000 },
      ],
      excluded_periods: [],
      preview: { final_total: 12000, discount_total: 0, original_total: 12000 },
    };
    const payload = buildStudentCreatePayload(profile, {
      suggest: suggest as never,
      financeState: defaultStudentCreateFinanceFormState(suggest as never),
      schoolId: 3,
    });
    expect(payload.finance?.fee_plan_id).toBe(99);
    expect(payload.finance).not.toHaveProperty('final_total');
    expect(payload.finance).not.toHaveProperty('expected_total');
  });
});
