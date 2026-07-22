/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StudentCreateBillingStep } from '@/features/admin/students/components/student-create-billing-step';
import { StudentCreateGuardiansSummary } from '@/features/admin/students/components/student-create-guardians-summary';
import { StudentCreateStepper } from '@/features/admin/students/components/student-create-stepper';
import { defaultStudentCreateBillingFormState } from '@/features/admin/students/utils/student-create-billing-responsibility';
import {
  applyStudentCreateGuardianAtomicContractToPayload,
  collectStudentCreateGuardianEntries,
  derivePrimaryStudentCreateGuardianEntry,
} from '@/features/admin/students/utils/student-create-guardian-payload';
import {
  buildStudentCreatePayload,
  defaultStudentProfileFormState,
} from '@/features/admin/students/utils/student-profile';
import type { EnrollmentIntakeValues } from '@/features/admin/enrollment-intake/types';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';

afterEach(() => cleanup());

const tMap: Record<string, string> = {
  'admin.student360.create.billing.desc':
    'حدّد ولي الأمر الرئيسي ومعلومات الاتصال، ثم أضف أولياء آخرين إن لزم، واختر المسؤول عن الأداء.',
  'admin.student360.create.billing.summaryTitle': 'ملخص أولياء الأمر',
  'admin.student360.create.billing.summaryAria': 'ملخص أولياء الأمر المسجّلين',
  'admin.student360.create.billing.emptyStateTitle': 'لم يُضف أي ولي أمر بعد',
  'admin.student360.create.billing.emptyStateLead':
    'ابدأ باختيار ولي موجود في النظام أو بإدخال ولي جديد، ثم أكمل بيانات الاتصال وصلة القرابة.',
  'admin.student360.create.billing.primarySectionTitle': 'ولي الأمر الرئيسي',
  'admin.student360.create.billing.primarySectionLead':
    'هذا هو الشخص المعتمد أولًا في التواصل الإداري مع المدرسة.',
  'admin.student360.create.billing.primaryBadge': 'ولي الأمر الرئيسي',
  'admin.student360.create.billing.primaryBadgeHint':
    'لا يفترض أن يكون الأب دائمًا؛ اختر الشخص المناسب فعليًا.',
  'admin.student360.create.billing.billingBadge': 'المسؤول عن الأداء',
  'admin.student360.create.billing.existingBadge': 'موجود في النظام',
  'admin.student360.create.billing.newBadge': 'ولي جديد',
  'admin.student360.create.billing.additionalSectionTitle': 'أولياء أمر إضافيون',
  'admin.student360.create.billing.additionalSectionLead':
    'يمكن إضافة ولي ثانٍ أو أكثر عند الحاجة، دون فقدان بيانات الولي الرئيسي.',
  'admin.student360.create.billing.guardianSourceChooseTitle': 'مصدر ولي الأمر',
  'admin.student360.create.billing.guardianSourceExistingLabel': 'اختيار ولي موجود',
  'admin.student360.create.billing.guardianSourceNewLabel': 'إدخال ولي جديد',
  'admin.student360.create.billing.addAnotherGuardian': 'إضافة ولي أمر',
  'admin.student360.create.billing.additionalGuardianTitle': 'ولي أمر إضافي',
  'admin.student360.create.billing.removeAdditionalGuardian': 'إزالة ولي الأمر',
  'admin.student360.create.billing.guardianBillingLinked': 'ستُوجَّه الفواتير إلى ولي الأمر: {name}',
  'admin.student360.create.billingResponsibility.title': 'المسؤول عن الأداء',
  'admin.student360.create.billingResponsibility.lead':
    'حدّد من سيكون المسؤول عن الأداء لهذا التلميذ.',
  'admin.student360.create.billingResponsibility.partnerTypeLabel': 'نوع المسؤول عن الأداء',
  'admin.student360.create.billingResponsibility.partnerGuardian': 'ولي الأمر',
  'admin.student360.create.billingResponsibility.partnerStudent': 'التلميذ',
  'admin.student360.create.billingResponsibility.selectionPlaceholder': 'اختر المسؤول عن الأداء…',
  'admin.student360.create.billingResponsibility.selectionHint': 'hint',
  'admin.student360.create.billingResponsibility.billingGuardianLabel': 'الولي المسؤول عن الأداء',
  'admin.student360.create.billingResponsibility.billingGuardianSelectionHint': 'اختر الولي',
  'admin.student360.create.billingResponsibility.guardianRequiredHint': 'أدخل بيانات ولي الأمر أعلاه',
  'admin.siblings.sectionTitle': 'معلومات الإخوة',
  'admin.admissions.fields.guardianName': 'اسم ولي الأمر',
  'admin.admissions.fields.guardianPhone': 'رقم الهاتف',
  'admin.admissions.fields.guardianEmail': 'البريد الإلكتروني',
  'admin.admissions.fields.relationship': 'صلة القرابة',
  'admin.admissions.create.selectRelationship': 'اختر صلة القرابة',
  'admin.student360.relationshipType.father': 'الأب',
  'admin.student360.relationshipType.mother': 'الأم',
  'admin.student360.create.steps.identity': 'بيانات التلميذ',
  'admin.student360.create.steps.billing': 'أولياء الأمر',
  'admin.student360.create.steps.enrollment': 'التمدرس',
  'admin.student360.create.steps.finance': 'الخطة المالية والأداء',
  'admin.student360.create.steps.review': 'المراجعة والتسجيل',
  'admin.student360.create.stepperAria': 'خطوات تسجيل التلميذ',
  'admin.student360.create.stepStatus.current': 'المرحلة الحالية',
  'admin.student360.create.stepStatus.done': 'مكتملة',
  'admin.student360.create.stepStatus.upcoming': 'متبقية',
};

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    let msg = tMap[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, String(v));
      }
    }
    return msg;
  },
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 1 }),
}));

vi.mock('@/features/admin/enrollment-intake/enrollment-intake-fields', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/admin/enrollment-intake/enrollment-intake-fields')
  >('@/features/admin/enrollment-intake/enrollment-intake-fields');
  return {
    ...actual,
    EnrollmentIntakeSiblingsFields: () => <div data-testid="siblings-stub" />,
  };
});

vi.mock('@/features/admin/students/components/student-create-guardian-provision-section', () => ({
  StudentCreateGuardianProvisionSection: () => <div data-testid="provision-stub" />,
}));

function emptyIntake(overrides: Partial<EnrollmentIntakeValues> = {}): EnrollmentIntakeValues {
  return {
    firstNameAr: '',
    lastNameAr: '',
    firstNameFr: '',
    lastNameFr: '',
    gender: '',
    birthDate: '',
    birthPlace: '',
    nationalityId: '',
    massarCode: '',
    schoolNumber: '',
    code: '',
    admissionDate: '',
    externalReference: '',
    residenceAddress: '',
    street: '',
    city: '',
    zip: '',
    previousSchool: '',
    admissionNotes: '',
    hasSiblings: false,
    siblingsRawText: '',
    siblingsLevels: '',
    siblingLines: [],
    academicYearId: '',
    cycleCode: '',
    cycleId: '',
    levelId: '',
    streamId: '',
    classId: '',
    registrationType: '',
    actualJoinDate: '',
    isRepeating: false,
    registrationNotes: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: '',
    guardianEmail: '',
    sourceId: '',
    firstContactDate: '',
    nextAction: '',
    nextActionDate: '',
    ...overrides,
  };
}

function renderBillingStep(options?: {
  intake?: Partial<EnrollmentIntakeValues>;
  billing?: ReturnType<typeof defaultStudentCreateBillingFormState>;
  entries?: StudentCreateGuardianEntry[];
  onAddAdditionalGuardian?: () => void;
  onIntakePatch?: (patch: Partial<EnrollmentIntakeValues>) => void;
  onBillingChange?: (patch: Record<string, unknown>) => void;
}) {
  const intakeValues = emptyIntake(options?.intake);
  const billingState = options?.billing ?? {
    ...defaultStudentCreateBillingFormState(),
    guardianSourceMode: 'new' as const,
    responsibilitySelection: 'guardian' as const,
  };
  const onAddAdditionalGuardian = options?.onAddAdditionalGuardian ?? vi.fn();
  const onIntakePatch = options?.onIntakePatch ?? vi.fn();
  const onBillingChange = options?.onBillingChange ?? vi.fn();

  const profile = {
    ...defaultStudentProfileFormState(null),
    emergencyContactName: intakeValues.guardianName,
    emergencyPhone: intakeValues.guardianPhone,
    emergencyRelationship: intakeValues.guardianRelationship,
    guardianEmail: intakeValues.guardianEmail,
  };
  const guardianEntries =
    options?.entries ?? collectStudentCreateGuardianEntries(profile, billingState);

  render(
    <StudentCreateBillingStep
      billingState={billingState}
      guardianEntries={guardianEntries}
      linkedGuardianPerson={null}
      onBillingChange={onBillingChange}
      intakeValues={intakeValues}
      onIntakePatch={onIntakePatch}
      onLinkExistingGuardian={vi.fn()}
      onClearLinkedGuardian={vi.fn()}
      onGuardianSourceModeChange={vi.fn()}
      onProvisionAccessChange={vi.fn()}
      onAddAdditionalGuardian={onAddAdditionalGuardian}
      onAdditionalGuardianSourceModeChange={vi.fn()}
      onUpdateAdditionalGuardian={vi.fn()}
      onLinkAdditionalGuardian={vi.fn()}
      onClearAdditionalGuardian={vi.fn()}
      onRemoveAdditionalGuardian={vi.fn()}
      usedGuardianIds={new Set()}
      linkedGuardianPersonsByEntryKey={{}}
      guardian={{
        relationships: [
          { id: 'father', value: 'father', label: 'الأب' },
          { id: 'mother', value: 'mother', label: 'الأم' },
        ],
        relationshipsLoading: false,
        relationshipLoadFailed: false,
      }}
    />,
  );

  return { onAddAdditionalGuardian, onIntakePatch, onBillingChange, billingState, intakeValues };
}

describe('StudentCreateGuardiansSummary', () => {
  it('shows empty state when no guardians are complete', () => {
    render(<StudentCreateGuardiansSummary entries={[]} billingGuardianEntryKey={null} />);
    expect(screen.getByText('لم يُضف أي ولي أمر بعد')).toBeTruthy();
    expect(screen.getByText(/ابدأ باختيار ولي موجود/)).toBeTruthy();
  });

  it('lists primary guardian with badge and LTR phone', () => {
    const entry: StudentCreateGuardianEntry = {
      kind: 'new',
      entryKey: 'new-primary',
      full_name: 'فاطمة العلوي',
      phone: '0612345678',
      relationship_type: 'mother',
      is_primary_contact: true,
    };
    render(
      <StudentCreateGuardiansSummary entries={[entry]} billingGuardianEntryKey="new-primary" />,
    );
    expect(screen.getByText('ملخص أولياء الأمر')).toBeTruthy();
    expect(screen.getByText('فاطمة العلوي')).toBeTruthy();
    expect(screen.getByText('الأم')).toBeTruthy();
    const phone = screen.getByText('0612345678');
    expect(phone.getAttribute('dir')).toBe('ltr');
    expect(screen.getAllByText('ولي الأمر الرئيسي').length).toBeGreaterThan(0);
    expect(screen.getByText('المسؤول عن الأداء')).toBeTruthy();
    expect(screen.getByText('ولي جديد')).toBeTruthy();
  });
});

describe('StudentCreateBillingStep guardians design', () => {
  it('shows guardians step structure and empty state', () => {
    renderBillingStep();
    expect(screen.getAllByText('ولي الأمر الرئيسي').length).toBeGreaterThan(0);
    expect(screen.getByText('لم يُضف أي ولي أمر بعد')).toBeTruthy();
    expect(screen.getByText('أولياء أمر إضافيون')).toBeTruthy();
    expect(screen.getByText('المسؤول عن الأداء')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إضافة ولي أمر' })).toBeTruthy();
    expect(screen.getAllByText('اختيار ولي موجود').length).toBeGreaterThan(0);
    expect(screen.getAllByText('إدخال ولي جديد').length).toBeGreaterThan(0);
  });

  it('keeps phone and email fields LTR', () => {
    renderBillingStep({
      intake: {
        guardianName: 'أحمد بنعلي',
        guardianPhone: '0611111111',
        guardianRelationship: 'father',
        guardianEmail: 'a@example.com',
      },
    });
    const phone = screen.getByLabelText('رقم الهاتف') as HTMLInputElement;
    const email = screen.getByLabelText('البريد الإلكتروني') as HTMLInputElement;
    expect(phone.getAttribute('dir')).toBe('ltr');
    expect(email.getAttribute('dir')).toBe('ltr');
  });

  it('allows choosing relationship and editing primary guardian name', () => {
    const onIntakePatch = vi.fn();
    renderBillingStep({
      intake: { guardianName: 'أحمد', guardianRelationship: '' },
      onIntakePatch,
    });
    fireEvent.change(screen.getByLabelText('صلة القرابة'), { target: { value: 'mother' } });
    expect(onIntakePatch).toHaveBeenCalledWith({ guardianRelationship: 'mother' });
    fireEvent.change(screen.getByLabelText('اسم ولي الأمر'), { target: { value: 'سارة' } });
    expect(onIntakePatch).toHaveBeenCalledWith({ guardianName: 'سارة' });
  });

  it('adds a second guardian without wiping primary form state', () => {
    const onAddAdditionalGuardian = vi.fn();
    const { intakeValues } = renderBillingStep({
      intake: {
        guardianName: 'أحمد بنعلي',
        guardianPhone: '0612345678',
        guardianRelationship: 'father',
      },
      onAddAdditionalGuardian,
    });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة ولي أمر' }));
    expect(onAddAdditionalGuardian).toHaveBeenCalledTimes(1);
    expect(intakeValues.guardianName).toBe('أحمد بنعلي');
    expect(screen.getByDisplayValue('أحمد بنعلي')).toBeTruthy();
  });

  it('renders additional guardian and remove action with accessible name', () => {
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      guardianEntries: [
        {
          kind: 'new' as const,
          entryKey: 'additional-1',
          full_name: 'خديجة',
          phone: '0622222222',
          relationship_type: 'mother' as const,
          is_primary_contact: false,
        },
      ],
    };
    renderBillingStep({
      intake: {
        guardianName: 'أحمد',
        guardianPhone: '0611111111',
        guardianRelationship: 'father',
      },
      billing,
    });
    expect(screen.getByText('ولي أمر إضافي')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إزالة ولي الأمر' })).toBeTruthy();
  });

  it('lets user pick billing guardian among multiple via radio group', () => {
    const onBillingChange = vi.fn();
    const primary: StudentCreateGuardianEntry = {
      kind: 'new',
      entryKey: 'new-primary',
      full_name: 'أحمد',
      relationship_type: 'father',
      is_primary_contact: true,
    };
    const second: StudentCreateGuardianEntry = {
      kind: 'new',
      entryKey: 'additional-1',
      full_name: 'خديجة',
      relationship_type: 'mother',
      is_primary_contact: false,
    };
    renderBillingStep({
      intake: {
        guardianName: 'أحمد',
        guardianPhone: '0611111111',
        guardianRelationship: 'father',
      },
      billing: {
        ...defaultStudentCreateBillingFormState(),
        responsibilitySelection: 'guardian',
        billingGuardianEntryKey: 'new-primary',
        guardianEntries: [second],
      },
      entries: [primary, second],
      onBillingChange,
    });
    const group = screen.getByRole('radiogroup', { name: 'الولي المسؤول عن الأداء' });
    const radios = within(group).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    fireEvent.click(radios[1]);
    expect(onBillingChange).toHaveBeenCalledWith({ billingGuardianEntryKey: 'additional-1' });
  });

  it('does not expose banned foreign UI terms in the guardians step Arabic copy', () => {
    renderBillingStep({
      intake: { guardianName: 'أحمد', guardianRelationship: 'father' },
    });
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/\bGuardian\b/i);
    expect(body).not.toMatch(/Parent\s*[12]/i);
    expect(body).not.toMatch(/جهة اتصال\s*1/);
  });
});

describe('1B stepper remains intact', () => {
  it('still labels billing step as أولياء الأمر', () => {
    render(<StudentCreateStepper activeStep="identity" />);
    expect(screen.getByText('أولياء الأمر')).toBeTruthy();
    expect(screen.getByText('بيانات التلميذ')).toBeTruthy();
  });
});

describe('guardian contract preservation', () => {
  it('keeps primary derivation and payload mapping unchanged', () => {
    const profile = {
      ...defaultStudentProfileFormState(null),
      emergencyContactName: 'فاطمة العلوي',
      emergencyPhone: '0612345678',
      emergencyRelationship: 'mother',
      guardianEmail: 'f@example.com',
    };
    const billing = {
      ...defaultStudentCreateBillingFormState(),
      guardianSourceMode: 'new' as const,
      responsibilitySelection: 'guardian' as const,
    };
    const primary = derivePrimaryStudentCreateGuardianEntry(profile, billing);
    expect(primary).toMatchObject({
      kind: 'new',
      full_name: 'فاطمة العلوي',
      is_primary_contact: true,
      relationship_type: 'mother',
    });
    const base = buildStudentCreatePayload(profile);
    const withGuardians = applyStudentCreateGuardianAtomicContractToPayload(base, profile, billing);
    expect(withGuardians.guardian_relationships?.[0]).toMatchObject({
      guardian: { full_name: 'فاطمة العلوي' },
      is_primary_contact: true,
      relationship_type: 'mother',
    });
    expect(withGuardians.billing_responsibility?.mode).toBe('guardian');
  });
});
