import { describe, expect, it } from 'vitest';
import { deriveAssignments, findAssignedTeacher } from '@/features/admin/academic-setup/utils/assignments-derive';
import { detectSetupIssues } from '@/features/admin/academic-setup/utils/issues';
import { computeReadiness } from '@/features/admin/academic-setup/utils/readiness';
import { rankTeachersForAssignment, isHighLoadTeacher } from '@/features/admin/academic-setup/utils/teacher-ranking';
import {
  canManageTeachingAssignments,
  canViewAcademicSetup,
  isAcademicSetupPath,
} from '@/lib/permissions/academic-setup';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import type { CurrentUser } from '@/types/user';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

function adminUser(perms: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'a@test.ma',
    role: 'admin',
    permissions: perms as CurrentUser['permissions'],
    admin_kind: 'school_manager',
    school: { id: 1, name: 'Test' },
  };
}

describe('deriveAssignments', () => {
  const teachers: Teacher[] = [
    {
      id: 10,
      name: 'Ahmed',
      code: null,
      phone: null,
      email: null,
      classes: [{ id: 1, name: '1A' }],
      subjects: [{ id: 100, name: 'Math' }],
      status: 'active',
      qualification: null,
      specialization: null,
    },
  ];

  const classes: SchoolClass[] = [
    {
      id: 1,
      name: '1A',
      code: null,
      level: { id: 5, name: 'Primary 1' },
      academic_year: null,
      student_count: 20,
      capacity: 30,
      teachers: [{ id: 10, name: 'Ahmed' }],
      subjects: [
        { id: 100, name: 'Math' },
        { id: 101, name: 'Arabic' },
      ],
      status: 'active',
    },
  ];

  it('marks subject as assigned when class teacher teaches it', () => {
    const rows = deriveAssignments(classes, teachers);
    const math = rows.find((r) => r.subjectId === 100);
    const arabic = rows.find((r) => r.subjectId === 101);
    expect(math?.status).toBe('assigned');
    expect(math?.teacherId).toBe(10);
    expect(arabic?.status).toBe('unassigned');
  });

  it('findAssignedTeacher returns match', () => {
    const map = new Map(teachers.map((te) => [te.id, te]));
    expect(findAssignedTeacher(classes[0], 100, map)?.name).toBe('Ahmed');
  });
});

describe('computeReadiness', () => {
  it('returns 100% when no blocking issues', () => {
    const levels = [{ id: 1, name: 'L1' }];
    const teachers: Teacher[] = [
      {
        id: 10,
        name: 'T',
        code: null,
        phone: '1',
        email: null,
        classes: [{ id: 1, name: 'C1' }],
        subjects: [{ id: 100, name: 'S' }],
        status: 'active',
        qualification: null,
        specialization: null,
      },
    ];
    const classes: SchoolClass[] = [
      {
        id: 1,
        name: 'C1',
        code: null,
        level: { id: 1, name: 'L1' },
        academic_year: null,
        student_count: 1,
        capacity: 30,
        teachers: [{ id: 10, name: 'T' }],
        subjects: [{ id: 100, name: 'S' }],
        status: 'active',
      },
    ];
    const issues = detectSetupIssues(levels, classes, teachers, t);
    const readiness = computeReadiness(issues, true);
    expect(readiness.percent).toBe(100);
    expect(readiness.blockingCount).toBe(0);
  });

  it('returns 0% when no baseline data', () => {
    const readiness = computeReadiness([], false);
    expect(readiness.percent).toBe(0);
    expect(readiness.hasData).toBe(false);
  });
});

describe('rankTeachersForAssignment', () => {
  const cls: SchoolClass = {
    id: 1,
    name: '1A',
    code: null,
    level: { id: 5, name: 'P1' },
    academic_year: null,
    student_count: 20,
    capacity: 30,
    teachers: [{ id: 10, name: 'Ahmed' }],
    subjects: [{ id: 100, name: 'Math' }],
    status: 'active',
  };

  const teachers: Teacher[] = [
    {
      id: 10,
      name: 'Ahmed',
      code: null,
      phone: 'x',
      email: null,
      classes: [{ id: 1, name: '1A' }],
      subjects: [{ id: 100, name: 'Math' }],
      status: 'active',
      qualification: null,
      specialization: null,
    },
    {
      id: 11,
      name: 'Other',
      code: null,
      phone: null,
      email: null,
      classes: [],
      subjects: [{ id: 200, name: 'French' }],
      status: 'active',
      qualification: null,
      specialization: null,
    },
  ];

  it('ranks in-class subject teacher as best', () => {
    const ranked = rankTeachersForAssignment(cls, 100, teachers, t);
    expect(ranked[0].teacher.id).toBe(10);
    expect(ranked[0].tier).toBe('best');
  });
});

describe('isHighLoadTeacher', () => {
  it('detects high class count', () => {
    const teacher = {
      classes: Array.from({ length: 6 }, (_, i) => ({ id: i, name: `C${i}` })),
    } as Teacher;
    expect(isHighLoadTeacher(teacher)).toBe(true);
  });
});

describe('academic-setup permissions', () => {
  it('allows view with view_classes', () => {
    expect(canViewAcademicSetup(adminUser(['view_classes']))).toBe(true);
  });

  it('denies teacher role', () => {
    expect(
      canViewAcademicSetup({
        ...adminUser([]),
        role: 'teacher',
      }),
    ).toBe(false);
  });

  it('requires both manage perms for assignments', () => {
    expect(canManageTeachingAssignments(adminUser(['manage_classes']))).toBe(false);
    expect(
      canManageTeachingAssignments(adminUser(['manage_classes', 'manage_teachers'])),
    ).toBe(true);
  });

  it('detects academic setup paths', () => {
    expect(isAcademicSetupPath('/admin/settings/academic-setup/classes')).toBe(true);
    expect(isAcademicSetupPath('/admin/classes')).toBe(false);
  });
});
