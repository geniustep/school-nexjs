// @vitest-environment happy-dom

import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Teacher } from '@/types/teacher';
import { TeacherFamilyContextCard, TeacherProfileOverview } from './teacher-profile-overview';

afterEach(cleanup);

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const translations: Record<string, string> = {
  'common.dash': '—',
  'admin.teacherProfile.identityTitle': 'Personal information',
  'admin.teacherProfile.fullNameAr': 'Arabic full name',
  'admin.teacherProfile.fullNameFr': 'French full name',
  'admin.teacherProfile.operationalName': 'Operational name',
  'admin.teacherProfile.school': 'School',
  'admin.teacherProfile.professionalTitle': 'Professional status',
  'admin.teacherProfile.hireDate': 'Hire date',
  'admin.teacherProfile.contractType': 'Contract type',
  'admin.teacherProfile.employmentState': 'Employment status',
  'admin.teacherProfile.familyTitle': 'Family link',
  'admin.teacherProfile.guardianStatus': 'Guardian status',
  'admin.teacherProfile.guardianYes': 'Guardian',
  'admin.teacherProfile.guardianNo': 'Not a guardian',
  'admin.teacherProfile.guardianUnavailable': 'Unavailable',
  'admin.teacherProfile.linkedChildren': 'Linked children',
  'admin.teacherProfile.childrenEmpty': 'No linked children',
  'admin.teacherProfile.childClass': 'Class',
  'admin.teacherProfile.childSchool': 'School',
  'admin.academicSetup.teacherForm.gender': 'Gender',
  'admin.academicSetup.teacherForm.dateOfBirth': 'Birth date',
  'admin.academicSetup.teacherForm.teacherType': 'Teacher type',
  'admin.academicSetup.teacherForm.qualification': 'Qualification',
  'admin.academicSetup.teacherForm.specialization': 'Specialization',
  'admin.code': 'Code',
  'admin.phone': 'Phone',
  'admin.email': 'Email',
};

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => translations[key] ?? key,
}));

vi.mock('@/features/admin/staff/utils/staff-center-present', () => ({
  resolveTeacherTypeLabelFromCode: (value: string | null | undefined) => value || '—',
}));

function teacherFixture(): Teacher {
  return {
    id: 2437,
    name: 'Operational Teacher',
    code: 'T-2437',
    phone: '0600000000',
    email: 'teacher@example.test',
    identity: {
      name_ar: 'الأستاذة سمية الإدريسي',
      name_fr: 'Soumia El Idrissi',
      partner_id: 900,
    },
    guardian_context: {
      is_guardian: true,
      guardian_id: 77,
      children_count: 1,
      children: [
        {
          id: 14755,
          name: 'Yassine El Idrissi',
          code: 'ST-14755',
          class: { id: 12, name: '6A' },
          school: { id: 1, name: 'Nibras' },
        },
      ],
    },
    gender: 'female',
    date_of_birth: '1988-02-01',
    hire_date: '2022-09-01',
    contract_type: 'permanent',
    school: { id: 1, name: 'Nibras' },
    school_id: 1,
    school_ids: [{ id: 1, name: 'Nibras' }],
    classes: [],
    subjects: [],
    status: 'active',
    active: true,
    qualification: 'master',
    specialization: 'Mathematics',
    teacher_type: 'subject_teacher',
  };
}

describe('TeacherProfileOverview', () => {
  it('renders canonical Arabic and French names exactly', () => {
    render(<TeacherProfileOverview teacher={teacherFixture()} options={null} />);

    expect(screen.getByText('الأستاذة سمية الإدريسي')).toBeTruthy();
    expect(screen.getByText('Soumia El Idrissi')).toBeTruthy();
    expect(screen.getByText('Operational Teacher')).toBeTruthy();
  });

  it('renders guardian children with a direct student link', () => {
    render(<TeacherFamilyContextCard teacher={teacherFixture()} />);

    expect(screen.getAllByText('Guardian').length).toBeGreaterThan(0);
    const child = screen.getByRole('link', { name: /Yassine El Idrissi/ });
    expect(child.getAttribute('href')).toBe('/admin/students/14755');
    expect(screen.getByText('6A')).toBeTruthy();
    expect(screen.getByText('Nibras')).toBeTruthy();
  });

  it('distinguishes explicit non-guardian from an unavailable guardian contract', () => {
    const nonGuardian = teacherFixture();
    nonGuardian.guardian_context = {
      is_guardian: false,
      guardian_id: null,
      children_count: 0,
      children: [],
    };
    const { rerender } = render(<TeacherFamilyContextCard teacher={nonGuardian} />);
    expect(screen.getAllByText('Not a guardian').length).toBeGreaterThan(0);
    expect(screen.queryByText('Unavailable')).toBeNull();

    const unavailable = teacherFixture();
    delete unavailable.guardian_context;
    rerender(<TeacherFamilyContextCard teacher={unavailable} />);
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    expect(screen.queryByText('Not a guardian')).toBeNull();
  });
});
