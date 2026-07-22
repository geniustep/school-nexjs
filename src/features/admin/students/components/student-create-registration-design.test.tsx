/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnrollmentIntakeIdentityFields } from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import { StudentCreatePageHeader } from '@/features/admin/students/components/student-create-page-header';
import { StudentCreateStepper } from '@/features/admin/students/components/student-create-stepper';
import {
  buildStudentCreatePayload,
  defaultStudentProfileFormState,
  validateStudentCreateIdentityStep,
  type StudentProfileFormState,
} from '@/features/admin/students/utils/student-profile';
import type { EnrollmentIntakeValues } from '@/features/admin/enrollment-intake/types';

afterEach(() => cleanup());

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => {
    const map: Record<string, string> = {
      'admin.student360.create.pageTitle': 'تسجيل تلميذ جديد',
      'admin.student360.create.pageDesc':
        'أدخل بيانات التلميذ الأساسية، ثم أكمل مراحل التسجيل.',
      'admin.student360.create.stepperAria': 'خطوات تسجيل التلميذ',
      'admin.student360.create.steps.identity': 'بيانات التلميذ',
      'admin.student360.create.steps.billing': 'أولياء الأمر',
      'admin.student360.create.steps.enrollment': 'التمدرس',
      'admin.student360.create.steps.finance': 'الخطة المالية والأداء',
      'admin.student360.create.steps.review': 'المراجعة والتسجيل',
      'admin.student360.create.stepStatus.current': 'المرحلة الحالية',
      'admin.student360.create.stepStatus.done': 'مكتملة',
      'admin.student360.create.stepStatus.upcoming': 'متبقية',
      'admin.student360.create.groups.basic': 'البيانات الأساسية',
      'admin.student360.create.groups.latinNames': 'الاسم باللاتينية',
      'admin.student360.create.groups.previousPath': 'المسار الدراسي السابق',
      'admin.student360.create.groups.address': 'عنوان الإقامة',
      'admin.student360.create.groups.registrationInfo': 'معلومات التسجيل',
      'admin.student360.create.additionalInfo': 'معلومات إضافية',
      'admin.student360.create.firstNameAr': 'الاسم الشخصي بالعربية',
      'admin.student360.create.lastNameAr': 'الاسم العائلي بالعربية',
      'admin.student360.create.firstNameLatin': 'الاسم الشخصي باللاتينية',
      'admin.student360.create.lastNameLatin': 'الاسم العائلي باللاتينية',
      'admin.student360.create.admissionDateHint': 'hint',
      'admin.student360.create.massarCodeHint': 'massar hint',
      'admin.enrollmentIntake.admissionNotes': 'ملاحظات داخلية',
      'admin.enrollmentIntake.residenceAddressHint': 'address hint',
      'admin.enrollmentIntake.groups.names': 'الأسماء',
      'admin.enrollmentIntake.groups.personal': 'البيانات الشخصية',
      'admin.gender': 'الجنس',
      'admin.dateOfBirth': 'تاريخ الميلاد',
      'admin.admissionDate': 'تاريخ القبول',
      'admin.massarCode': 'رقم مسار',
      'admin.student360.birthPlace': 'مكان الميلاد',
      'admin.student360.nationality': 'الجنسية',
      'admin.student360.admissionData.residenceAddress': 'عنوان الإقامة',
      'admin.student360.admissionData.previousSchool': 'المؤسسة السابقة',
      'common.dash': '—',
      'admin.student360.errors.firstNameRequired': 'الاسم الشخصي مطلوب.',
      'admin.student360.errors.lastNameRequired': 'اسم العائلة مطلوب.',
    };
    return map[key] ?? key;
  },
}));

vi.mock('@/components/ui/date-picker-input', () => ({
  DatePickerInput: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <input
      data-testid="date-picker"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('@/features/admin/students/components/student-form-fields', () => ({
  StudentNationalitySelect: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <select
      data-testid="nationality"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      <option value="1">مغربية</option>
    </select>
  ),
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

function baseProfile(overrides: Partial<StudentProfileFormState> = {}): StudentProfileFormState {
  return {
    ...defaultStudentProfileFormState(null),
    firstName: 'محمد',
    lastName: 'العلوي',
    ...overrides,
  };
}

describe('student registration design 1B — header', () => {
  it('shows fixed Arabic title and secondary name when present', () => {
    render(<StudentCreatePageHeader state={baseProfile()} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('تسجيل تلميذ جديد');
    expect(screen.getByText('محمد العلوي')).toBeTruthy();
    expect(screen.getByText(/أدخل بيانات التلميذ الأساسية/)).toBeTruthy();
  });

  it('does not put pupil name inside the main title', () => {
    render(
      <StudentCreatePageHeader
        state={baseProfile({ firstNameLatin: 'Mohamed', lastNameLatin: 'Alaoui' })}
      />,
    );
    const title = screen.getByRole('heading', { level: 1 });
    expect(title.textContent).toBe('تسجيل تلميذ جديد');
    expect(title.textContent).not.toContain('محمد');
  });
});

describe('student registration design 1B — stepper', () => {
  it('renders the five Moroccan Arabic step labels', () => {
    render(<StudentCreateStepper activeStep="identity" />);
    expect(screen.getByLabelText(/1\. بيانات التلميذ/)).toBeTruthy();
    expect(screen.getByLabelText(/2\. أولياء الأمر/)).toBeTruthy();
    expect(screen.getByLabelText(/3\. التمدرس/)).toBeTruthy();
    expect(screen.getByLabelText(/4\. الخطة المالية والأداء/)).toBeTruthy();
    expect(screen.getByLabelText(/5\. المراجعة والتسجيل/)).toBeTruthy();
  });

  it('marks current and completed steps without relying on color alone', () => {
    const { container } = render(<StudentCreateStepper activeStep="enrollment" />);
    expect(container.querySelector('[data-active][aria-current="step"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-done]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-upcoming]')).toHaveLength(2);
  });
});

describe('student registration design 1B — identity fields', () => {
  it('hides name preview and FR tag for studentCreate', () => {
    const { container } = render(
      <EnrollmentIntakeIdentityFields
        values={emptyIntake({
          firstNameAr: 'سارة',
          lastNameAr: 'بناني',
          firstNameFr: 'Sara',
          lastNameFr: 'Benani',
        })}
        onPatch={() => undefined}
        genders={[{ value: 'female', label: 'أنثى' }]}
        nationalities={[]}
        variant="studentCreate"
      />,
    );
    expect(container.querySelector('.student-create-form__name-preview')).toBeNull();
    expect(container.textContent).not.toContain('FR');
    expect(container.textContent).not.toContain('فرنسي');
  });

  it('keeps name preview for admissions default variant', () => {
    const { container } = render(
      <EnrollmentIntakeIdentityFields
        values={emptyIntake({
          firstNameAr: 'سارة',
          lastNameAr: 'بناني',
          firstNameFr: 'Sara',
          lastNameFr: 'Benani',
        })}
        onPatch={() => undefined}
        genders={[{ value: 'female', label: 'أنثى' }]}
        nationalities={[]}
        requireArabicNames
        intakeContext="admissionCreate"
      />,
    );
    expect(container.querySelector('.student-create-form__name-preview')).toBeTruthy();
    expect(container.textContent).toContain('لاتيني');
    expect(container.textContent).not.toContain('FR');
  });

  it('collapses latin names by default when empty and preserves values when toggled', () => {
    const values = emptyIntake({ firstNameAr: 'نور', lastNameAr: 'فاسي' });
    const onPatch = vi.fn();
    const { rerender } = render(
      <EnrollmentIntakeIdentityFields
        values={values}
        onPatch={onPatch}
        genders={[]}
        nationalities={[]}
        variant="studentCreate"
      />,
    );

    const details = document.querySelector('details.student-create-form__latin-details');
    expect(details).toBeTruthy();
    expect(details?.hasAttribute('open')).toBe(false);

    const latinFirst = screen.getByLabelText('الاسم الشخصي باللاتينية') as HTMLInputElement;
    fireEvent.change(latinFirst, { target: { value: 'Nour' } });
    expect(onPatch).toHaveBeenCalledWith({ firstNameFr: 'Nour' });

    rerender(
      <EnrollmentIntakeIdentityFields
        values={{ ...values, firstNameFr: 'Nour' }}
        onPatch={onPatch}
        genders={[]}
        nationalities={[]}
        variant="studentCreate"
      />,
    );
    expect(document.querySelector('details.student-create-form__latin-details')?.hasAttribute('open')).toBe(
      true,
    );
    expect((screen.getByLabelText('الاسم الشخصي باللاتينية') as HTMLInputElement).value).toBe('Nour');
  });

  it('groups massar and previous school under previous path title', () => {
    render(
      <EnrollmentIntakeIdentityFields
        values={emptyIntake()}
        onPatch={() => undefined}
        genders={[]}
        nationalities={[]}
        variant="studentCreate"
      />,
    );
    expect(screen.getByText('المسار الدراسي السابق')).toBeTruthy();
    expect(screen.getByText('ملاحظات داخلية')).toBeTruthy();
    expect(document.querySelector('[data-field="massarCode"]')).toBeTruthy();
    expect(screen.getByText('رقم مسار')).toBeTruthy();
  });
});

describe('student registration design 1B — contract freeze', () => {
  const t = (key: string) => key;

  it('keeps identity validation requiring Arabic names', () => {
    const empty = validateStudentCreateIdentityStep(defaultStudentProfileFormState(null), t);
    expect(empty.valid).toBe(false);
    expect(empty.errors.firstName).toBeTruthy();
    expect(empty.errors.lastName).toBeTruthy();

    const ok = validateStudentCreateIdentityStep(baseProfile(), t);
    expect(ok.valid).toBe(true);
  });

  it('does not change create payload identity keys', () => {
    const payload = buildStudentCreatePayload(
      baseProfile({
        firstNameLatin: 'Mohamed',
        lastNameLatin: 'Alaoui',
        massarCode: 'G412252321',
        birthPlace: 'فاس',
        residenceAddress: 'شارع الحسن الثاني',
        previousSchool: 'مدرسة سابقة',
        admissionNotes: 'ملاحظة',
      }),
    );
    expect(payload.first_name).toBe('محمد');
    expect(payload.last_name).toBe('العلوي');
    expect(payload.name_latin).toBe('Mohamed Alaoui');
    expect(payload.massar_code).toBe('G412252321');
    expect(payload.birth_place).toBe('فاس');
    expect(payload.residence_address).toBe('شارع الحسن الثاني');
    expect(payload.previous_school).toBe('مدرسة سابقة');
    expect(payload.admission_notes).toBe('ملاحظة');
  });
});
