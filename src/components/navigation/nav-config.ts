// Role-based navigation — admin items filtered by permissions[] (Admin-1).

import type { CurrentUser } from '@/types/user';
import type { Permission } from '@/types/permissions';
import { hasPermission } from '@/lib/permissions/permissions';
import { isConfiguredAdmin } from '@/lib/permissions/scope';

export interface NavItem {
  labelKey: string;
  href: string;
  icon: string;
  isActive?: (pathname: string) => boolean;
}

export interface NavSection {
  titleKey?: string;
  items: NavItem[];
}

function pushIf(items: NavItem[], allowed: boolean, item: NavItem): void {
  if (allowed) items.push(item);
}

function adminNav(user: CurrentUser): NavSection[] {
  const sections: NavSection[] = [];

  const opsItems: NavItem[] = [];
  pushIf(opsItems, hasPermission(user, 'view_dashboard'), {
    labelKey: 'nav.dashboard',
    href: '/admin/dashboard',
    icon: '🏠',
  });
  pushIf(opsItems, hasPermission(user, 'view_attendance'), {
    labelKey: 'nav.attendance',
    href: '/admin/attendance?date=today',
    icon: '🗓️',
  });
  if (opsItems.length) sections.push({ titleKey: 'nav.adminOperations', items: opsItems });

  const schoolItems: NavItem[] = [];
  pushIf(schoolItems, hasPermission(user, 'view_students'), {
    labelKey: 'nav.students',
    href: '/admin/students',
    icon: '🎓',
  });
  pushIf(schoolItems, hasPermission(user, 'view_parents'), {
    labelKey: 'nav.parents',
    href: '/admin/parents',
    icon: '👪',
  });
  pushIf(schoolItems, hasPermission(user, 'view_teachers'), {
    labelKey: 'nav.teachers',
    href: '/admin/teachers',
    icon: '👩‍🏫',
  });
  if (hasPermission(user, 'view_classes')) {
    schoolItems.push(
      { labelKey: 'nav.classes', href: '/admin/classes', icon: '🏫' },
      { labelKey: 'nav.levels', href: '/admin/levels', icon: '📚' },
      { labelKey: 'nav.subjects', href: '/admin/subjects', icon: '📖' },
    );
  }
  if (schoolItems.length) sections.push({ titleKey: 'nav.adminSchool', items: schoolItems });

  const contentItems: NavItem[] = [];
  pushIf(contentItems, hasPermission(user, 'view_homeworks'), {
    labelKey: 'nav.homework',
    href: '/admin/homeworks',
    icon: '📝',
  });
  pushIf(contentItems, hasPermission(user, 'view_resources'), {
    labelKey: 'nav.resources',
    href: '/admin/resources',
    icon: '📚',
  });
  pushIf(contentItems, hasPermission(user, 'view_timetable'), {
    labelKey: 'nav.timetable',
    href: '/admin/timetable',
    icon: '📅',
  });
  pushIf(contentItems, hasPermission(user, 'view_exams'), {
    labelKey: 'nav.exams',
    href: '/admin/exams',
    icon: '📋',
    isActive: (pathname) =>
      pathname === '/admin/exams' ||
      (pathname.startsWith('/admin/exams/') && !pathname.includes('/results')),
  });
  pushIf(contentItems, hasPermission(user, 'view_exam_results'), {
    labelKey: 'nav.examResultsNav',
    href: '/admin/exam-results',
    icon: '📊',
    isActive: (pathname) =>
      pathname === '/admin/exam-results' ||
      pathname.startsWith('/admin/exam-results/') ||
      /\/admin\/exams\/\d+\/results/.test(pathname),
  });
  if (contentItems.length) {
    sections.push({ titleKey: 'nav.adminContentAssessment', items: contentItems });
  }

  if (hasPermission(user, 'view_channels')) {
    sections.push({
      titleKey: 'nav.communication',
      items: [{ labelKey: 'nav.channels', href: '/admin/channels', icon: '💬' }],
    });
  }

  return sections;
}

function teacherNav(): NavSection[] {
  return [
    { items: [{ labelKey: 'nav.dashboard', href: '/teacher/dashboard', icon: '🏠' }] },
    {
      titleKey: 'nav.teaching',
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
        { labelKey: 'nav.submissions', href: '/teacher/submissions', icon: '📥' },
      ],
    },
    {
      titleKey: 'nav.communication',
      items: [{ labelKey: 'nav.channels', href: '/teacher/channels', icon: '💬' }],
    },
  ];
}

function parentNav(): NavSection[] {
  return [
    { items: [{ labelKey: 'nav.dashboard', href: '/parent/dashboard', icon: '🏠' }] },
    {
      titleKey: 'nav.family',
      items: [{ labelKey: 'nav.myChildren', href: '/parent/children', icon: '👧' }],
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
  { permission: 'view_attendance', href: '/admin/attendance', labelKey: 'nav.attendance' },
  { permission: 'view_channels', href: '/admin/channels', labelKey: 'nav.channels' },
  { permission: 'view_homeworks', href: '/admin/homeworks', labelKey: 'nav.homework' },
  { permission: 'view_resources', href: '/admin/resources', labelKey: 'nav.resources' },
  { permission: 'view_exams', href: '/admin/exams', labelKey: 'nav.exams' },
  { permission: 'view_exam_results', href: '/admin/exam-results', labelKey: 'nav.examResultsNav' },
  { permission: 'view_timetable', href: '/admin/timetable', labelKey: 'nav.timetable' },
];

export function navForUser(user: CurrentUser): NavSection[] {
  switch (user.role) {
    case 'admin':
      if (!isConfiguredAdmin(user)) {
        return hasPermission(user, 'view_dashboard')
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
