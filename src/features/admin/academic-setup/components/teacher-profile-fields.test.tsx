// @vitest-environment happy-dom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TeacherOptions } from '@/types/teacher';
import { defaultTeacherProfileFormState } from '../utils/teacher-profile';
import { TeacherProfileFields } from './teacher-profile-fields';

const translations: Record<string, string> = {
  'admin.phone': 'Phone',
  'admin.email': 'Email',
  'admin.code': 'Code',
  'admin.teacherProfile.mobile': 'Mobile',
  'admin.teacherProfile.fullNameAr': 'Arabic full name',
  'admin.teacherProfile.fullNameFr': 'French full name',
  'admin.teacherProfile.operationalName': 'Operational name',
  'admin.teacherProfile.hireDate': 'Hire date',
  'admin.teacherProfile.contractType': 'Contract type',
  'admin.teacherProfile.contractTypeEmpty': 'Not specified',
  'admin.teacherProfile.schools': 'Linked schools',
  'admin.teacherProfile.primarySchool': 'Primary school',
  'admin.teacherProfile.schoolSelectionHint': 'Multiple schools are supported.',
};

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => translations[key] ?? key,
}));

const options: TeacherOptions = {
  teacherTypes: [{ value: 'subject_teacher', label: 'Subject teacher' }],
  qualifications: [],
  contractTypes: [{ value: 'permanent', label: 'Permanent' }],
  statuses: [{ value: 'active', label: 'Active' }],
  genders: [],
  schools: [
    { id: 1, name: 'Nibras' },
    { id: 2, name: 'Alwah' },
  ],
  defaults: {
    teacherType: 'subject_teacher',
    status: 'active',
    active: true,
    preferCompactSchedule: false,
  },
  constraints: {},
};

describe('TeacherProfileFields edit contacts and schools', () => {
  it('renders editable phone and mobile and exposes multi-school membership', () => {
    const onChange = vi.fn();
    const state = {
      ...defaultTeacherProfileFormState(options),
      name: 'Teacher',
      phone: '0500000000',
      mobile: '0600000000',
      schoolId: '1',
      schoolIds: ['1', '2'],
    };

    render(
      <TeacherProfileFields
        state={state}
        options={options}
        errors={{}}
        creating={false}
        saving={false}
        onChange={onChange}
        showEmailField={false}
      />,
    );

    const phone = screen.getByLabelText('Phone') as HTMLInputElement;
    const mobile = screen.getByLabelText('Mobile') as HTMLInputElement;
    expect(phone.value).toBe('0500000000');
    expect(mobile.value).toBe('0600000000');

    fireEvent.change(phone, { target: { value: '0511111111' } });
    fireEvent.change(mobile, { target: { value: '0611111111' } });
    expect(onChange).toHaveBeenCalledWith({ phone: '0511111111' });
    expect(onChange).toHaveBeenCalledWith({ mobile: '0611111111' });

    expect((screen.getByRole('checkbox', { name: 'Nibras' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: 'Alwah' }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Primary school') as HTMLSelectElement).value).toBe('1');
  });

  it('moves the primary school when the current primary membership is unchecked', () => {
    const onChange = vi.fn();
    const state = {
      ...defaultTeacherProfileFormState(options),
      name: 'Teacher',
      schoolId: '1',
      schoolIds: ['1', '2'],
    };

    render(
      <TeacherProfileFields
        state={state}
        options={options}
        errors={{}}
        creating={false}
        saving={false}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Nibras' }));
    expect(onChange).toHaveBeenCalledWith({ schoolIds: ['2'], schoolId: '2' });
  });
});
