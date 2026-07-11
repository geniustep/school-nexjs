// Role-based navigation — admin items filtered by permissions[] + admin_kind UX (RBAC-UX-2A).

import type { CurrentUser } from '@/types/user';
import type { Permission } from '@/types/permissions';
import { canAccessAdminDashboard, canShowAdminNavPermission, useScopedNavLabels } from '@/lib/admin/admin-ux';
import { canViewSettings, canAccessStaffCenter } from '@/lib/permissions/academic-setup';
import { canViewSchoolBrandingSettings } from '@/lib/permissions/school-branding-settings';
import { FINANCE_VIEW } from '@/lib/permissions/finance';
import { ADMISSION_VIEW } from '@/lib/permissions/admission';
import { isConfiguredAdmin } from '@/lib/permissions/scope';
import { shouldUseTeacherWorkspace } from '@/lib/auth/teacher-workspace';
import { shouldUsePedagogicalNav } from '@/lib/admin/pedagogical-dashboard';

export interface NavItem {
  labelKey: string;
  href: string;
  icon: string;
  isActive?: (pathname: string) => boolean;
}

export interface NavSection {
  titleKey?: string;
  groupId?: string;
  defaultOpen?: boolean;
  items: NavItem[];
}

function pushIf(items: NavItem[], allowed: boolean, item: NavItem): void {
  if (allowed) items.push(item);
}

function pushSection(
  sections: NavSection[],
  section: Omit<NavSection, 'items'> & { items: NavItem[] },
): void {
  if (section.items.length) sections.push(section);
}

function scopedNavTitle(baseKey: string, scopedKey: string, scoped: boolean): string {
  return scoped ? scopedKey : baseKey;
}

function adminNav(user: CurrentUser): NavSection[] {
  const sections: NavSection[] = [];
  const pedagogicalNav = shouldUsePedagogicalNav(user);
  const scopedLabels = pedagogicalNav ? false : useScopedNavLabels(user);

  const opsItems: NavItem[] = [];
  pushIf(opsItems, canShowAdminNavPermission(user, 'view_dashboard') || pedagogicalNav, {
    labelKey: 'nav.dashboard',
    href: '/admin/dashboard',
    icon: '🏠',
  });
  pushIf(opsItems, canShowAdminNavPermission(user, 'view_attendance'), {
    labelKey: 'nav.attendance',
    href: '/admin/attendance?date=today',
    icon: '🗓️',
    isActive: (pathname) => pathname === '/admin/attendance' || pathname.startsWith('/admin/attendance/'),
  });
  pushSection(sections, {
    groupId: 'ops',
    defaultOpen: true,
    titleKey: scopedNavTitle('nav.adminOperations', 'nav.adminScopedOperations', scopedLabels),
    items: opsItems,
  });

  const studentsItems: NavItem[] = [];
  pushIf(studentsItems, canShowAdminNavPermission(user, ADMISSION_VIEW), {
    labelKey: 'nav.admissions',
    href: '/admin/admissions',
    icon: '📋',
  });
  pushIf(studentsItems, canShowAdminNavPermission(user, 'view_students'), {
    labelKey: 'nav.students',
    href: '/admin/students',
    icon: '🎓',
  });
  pushIf(studentsItems, canShowAdminNavPermission(user, 'view_parents'), {
    labelKey: 'nav.parents',
    href: '/admin/parents',
    icon: '👪',
  });
  pushSection(sections, {
    groupId: 'students',
    defaultOpen: true,
    titleKey: scopedNavTitle(
      'nav.adminStudentsRegistration',
      'nav.adminScopedStudentsRegistration',
      scopedLabels,
    ),
    items: studentsItems,
  });

  const staffItems: NavItem[] = [];
  pushIf(staffItems, canShowAdminNavPermission(user, 'view_teachers'), {
    labelKey: 'nav.teachers',
    href: '/admin/teachers',
    icon: '👩‍🏫',
  });
  pushIf(staffItems, canAccessStaffCenter(user), {
    labelKey: 'nav.staffCenter',
    href: '/admin/staff',
    icon: '🧑‍💼',
  });
  pushSection(sections, {
    groupId: 'staff',
    titleKey: scopedNavTitle('nav.adminSchoolStaff', 'nav.adminScopedSchoolStaff', scopedLabels),
    items: staffItems,
  });

  const academicItems: NavItem[] = [];
  if (canShowAdminNavPermission(user, 'view_classes')) {
    academicItems.push(
      { labelKey: 'nav.classes', href: '/admin/classes', icon: '🏫' },
      { labelKey: 'nav.levels', href: '/admin/levels', icon: '📚' },
      { labelKey: 'nav.subjects', href: '/admin/subjects', icon: '📖' },
    );
  }
  pushIf(academicItems, canShowAdminNavPermission(user, 'view_timetable'), {
    labelKey: 'nav.timetable',
    href: '/admin/timetable',
    icon: '📅',
  });
  pushSection(sections, {
    groupId: 'academic',
    defaultOpen: true,
    titleKey: scopedNavTitle('nav.adminAcademicSetup', 'nav.adminScopedAcademicSetup', scopedLabels),
    items: academicItems,
  });

  const learningItems: NavItem[] = [];
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_homeworks'), {
    labelKey: 'nav.homework',
    href: '/admin/homeworks',
    icon: '📝',
  });
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_resources'), {
    labelKey: 'nav.resources',
    href: '/admin/resources',
    icon: '📚',
  });
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_exams'), {
    labelKey: 'nav.exams',
    href: '/admin/exams',
    icon: '📋',
    isActive: (pathname) =>
      pathname === '/admin/exams' ||
      (pathname.startsWith('/admin/exams/') && !pathname.includes('/results')),
  });
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_exam_results'), {
    labelKey: 'nav.examResultsNav',
    href: '/admin/exam-results',
    icon: '📊',
    isActive: (pathname) =>
      pathname === '/admin/exam-results' ||
      pathname.startsWith('/admin/exam-results/') ||
      /\/admin\/exams\/\d+\/results/.test(pathname),
  });
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_exams'), {
    labelKey: 'nav.gradebooks',
    href: '/admin/academics/assessment/gradebooks',
    icon: '📒',
    isActive: (pathname) => pathname.startsWith('/admin/academics/assessment/gradebooks'),
  });
  pushSection(sections, {
    groupId: 'learning',
    titleKey: scopedNavTitle(
      'nav.adminLearningAssessment',
      'nav.adminScopedLearningAssessment',
      scopedLabels,
    ),
    items: learningItems,
  });

  if (canShowAdminNavPermission(user, 'view_channels')) {
    pushSection(sections, {
      groupId: 'communication',
      titleKey: scopedNavTitle('nav.communication', 'nav.adminScopedCommunication', scopedLabels),
      items: [{ labelKey: 'nav.channels', href: '/admin/channels', icon: '💬' }],
    });
  }

  if (canShowAdminNavPermission(user, FINANCE_VIEW)) {
    pushSection(sections, {
      groupId: 'finance',
      titleKey: scopedNavTitle('nav.financeSection', 'nav.adminScopedFinance', scopedLabels),
      items: [
        {
          labelKey: 'nav.finance',
          href: '/admin/finance',
          icon: '💰',
          isActive: (pathname) => pathname.startsWith('/admin/finance'),
        },
      ],
    });
  }

  if (canViewSettings(user) || canViewSchoolBrandingSettings(user)) {
    if (!pedagogicalNav || canViewSettings(user)) {
      pushSection(sections, {
        groupId: 'system',
        titleKey: scopedNavTitle('nav.adminSystem', 'nav.adminScopedSystem', scopedLabels),
        items: [
          {
            labelKey: 'nav.settings',
            href: '/admin/settings',
            icon: '⚙️',
            isActive: (pathname) => pathname.startsWith('/admin/settings'),
          },
        ],
      });
    }
  }

  return sections;
}

function teacherNav(): NavSection[] {
  return [
    { items: [{ labelKey: 'nav.dashboard', href: '/teacher/dashboard', icon: '🏠' }] },
    {
      titleKey: 'teacher.myTeachingTasks',
      items: [
        { labelKey: 'nav.myClasses', href: '/teacher/classes', icon: '🏫' },
        { labelKey: 'nav.attendance', href: '/teacher/attendance', icon: '🗓️' },
        { labelKey: 'nav.timetable', href: '/teacher/timetable', icon: '📅' },
      ],
    },
    {
      titleKey: 'nav.content',
      items: [
        { labelKey: 'nav.homework', href: '/teacher/homeworks', icon: '📝' },
        { labelKey: 'nav.teacherResources', href: '/teacher/resources', icon: '📚' },
      ],
    },
    {
      titleKey: 'nav.assessment',
      items: [
        {
          labelKey: 'nav.exams',
          href: '/teacher/exams',
          icon: '📋',
          isActive: (pathname) =>
            pathname === '/teacher/exams' ||
            (pathname.startsWith('/teacher/exams/') && !pathname.endsWith('/results')),
        },
        {
          labelKey: 'nav.results',
          href: '/teacher/exam-results',
          icon: '📊',
          isActive: (pathname) =>
            pathname === '/teacher/exam-results' ||
            pathname.startsWith('/teacher/exam-results/') ||
            /\/teacher\/exams\/\d+\/results/.test(pathname),
        },
        {
          labelKey: 'nav.gradebooks',
          href: '/teacher/assessment/gradebooks',
          icon: '📒',
          isActive: (pathname) => pathname.startsWith('/teacher/assessment/gradebooks'),
        },
        { labelKey: 'nav.submissions', href: '/teacher/submissions', icon: '📥' },
      ],
    },
    {
      titleKey: 'nav.communication',
      items: [{ labelKey: 'nav.channels', href: '/teacher/channels', icon: '💬' }],
    },
    {
      titleKey: 'teacher.workspaceNavProfile',
      items: [{ labelKey: 'teacher.myProfileNav', href: '/teacher/profile', icon: '👤' }],
    },
  ];
}

function parentNav(): NavSection[] {
  return [
    { items: [{ labelKey: 'nav.dashboard', href: '/parent/dashboard', icon: '🏠' }] },
    {
      titleKey: 'nav.family',
      items: [
        { labelKey: 'nav.myChildren', href: '/parent/children', icon: '👧' },
        { labelKey: 'nav.finance', href: '/parent/finance', icon: '💰' },
      ],
    },
    {
      titleKey: 'nav.communication',
      items: [{ labelKey: 'nav.channels', href: '/parent/channels', icon: '💬' }],
    },
  ];
}

function studentNav(): NavSection[] {
  return [
    { items: [{ labelKey: 'nav.dashboard', href: '/student/dashboard', icon: '🏠' }] },
    {
      titleKey: 'nav.me',
      items: [
        { labelKey: 'nav.myProfile', href: '/student/profile', icon: '🧑‍🎓' },
        { labelKey: 'nav.attendance', href: '/student/attendance', icon: '🗓️' },
        { labelKey: 'nav.timetable', href: '/student/timetable', icon: '📅' },
      ],
    },
    {
      titleKey: 'nav.communication',
      items: [
        { labelKey: 'nav.channels', href: '/student/channels', icon: '💬' },
        { labelKey: 'nav.announcements', href: '/student/announcements', icon: '📣' },
      ],
    },
  ];
}

export const ADMIN_NAV_BY_PERMISSION: { permission: Permission; href: string; labelKey: string }[] = [
  { permission: 'view_dashboard', href: '/admin/dashboard', labelKey: 'nav.dashboard' },
  { permission: 'view_students', href: '/admin/students', labelKey: 'nav.students' },
  { permission: 'view_parents', href: '/admin/parents', labelKey: 'nav.parents' },
  { permission: 'view_teachers', href: '/admin/teachers', labelKey: 'nav.teachers' },
  { permission: 'view_classes', href: '/admin/classes', labelKey: 'nav.classes' },
  { permission: 'view_classes', href: '/admin/staff', labelKey: 'nav.staffCenter' },
  { permission: 'view_attendance', href: '/admin/attendance', labelKey: 'nav.attendance' },
  { permission: 'view_channels', href: '/admin/channels', labelKey: 'nav.channels' },
  { permission: 'view_homeworks', href: '/admin/homeworks', labelKey: 'nav.homework' },
  { permission: 'view_resources', href: '/admin/resources', labelKey: 'nav.resources' },
  { permission: 'view_exams', href: '/admin/exams', labelKey: 'nav.exams' },
  { permission: 'view_exam_results', href: '/admin/exam-results', labelKey: 'nav.examResultsNav' },
  { permission: 'view_timetable', href: '/admin/timetable', labelKey: 'nav.timetable' },
  { permission: FINANCE_VIEW, href: '/admin/finance', labelKey: 'nav.finance' },
];

export function navForUser(user: CurrentUser): NavSection[] {
  if (shouldUseTeacherWorkspace(user)) return teacherNav();

  switch (user.role) {
    case 'admin':
      if (!isConfiguredAdmin(user)) {
        return canAccessAdminDashboard(user)
          ? [{ items: [{ labelKey: 'nav.dashboard', href: '/admin/dashboard', icon: '🏠' }] }]
          : [];
      }
      return adminNav(user);
    case 'teacher':
      return teacherNav();
    case 'parent':
      return parentNav();
    case 'student':
      return studentNav();
    default:
      return [];
  }
}
