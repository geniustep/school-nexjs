// Role-based navigation model. Items are filtered by permission AND admin
// scope so inaccessible sections never render (defence-in-depth alongside the
// server). Labels are i18n keys resolved in the shell via useT().

import type { CurrentUser } from '@/types/user';
import { hasPermission } from '@/lib/permissions/permissions';
import {
  canSeeChannels,
  canSeeStudentData,
  isConfiguredAdmin,
} from '@/lib/permissions/scope';

export interface NavItem {
  labelKey: string;
  href: string;
  icon: string;
}

export interface NavSection {
  titleKey?: string;
  items: NavItem[];
}

function adminNav(user: CurrentUser): NavSection[] {
  const sections: NavSection[] = [
    { items: [{ labelKey: 'nav.dashboard', href: '/admin/dashboard', icon: '🏠' }] },
  ];

  const dataItems: NavItem[] = [];
  if (canSeeStudentData(user)) {
    if (hasPermission(user, 'view_students'))
      dataItems.push({ labelKey: 'nav.students', href: '/admin/students', icon: '🎓' });
    if (hasPermission(user, 'view_parents'))
      dataItems.push({ labelKey: 'nav.parents', href: '/admin/parents', icon: '👪' });
    if (hasPermission(user, 'view_teachers'))
      dataItems.push({ labelKey: 'nav.teachers', href: '/admin/teachers', icon: '👩‍🏫' });
    if (hasPermission(user, 'view_classes')) {
      dataItems.push({ labelKey: 'nav.levels', href: '/admin/levels', icon: '📚' });
      dataItems.push({ labelKey: 'nav.classes', href: '/admin/classes', icon: '🏫' });
      dataItems.push({ labelKey: 'nav.subjects', href: '/admin/subjects', icon: '📖' });
    }
    if (hasPermission(user, 'view_attendance'))
      dataItems.push({ labelKey: 'nav.attendance', href: '/admin/attendance', icon: '🗓️' });
  }
  if (dataItems.length) sections.push({ titleKey: 'nav.school', items: dataItems });

  if (canSeeChannels(user) && hasPermission(user, 'view_channels')) {
    sections.push({
      titleKey: 'nav.communication',
      items: [{ labelKey: 'nav.channels', href: '/admin/channels', icon: '💬' }],
    });
  }

  if (canSeeStudentData(user) && hasPermission(user, 'view_classes')) {
    sections.push({
      titleKey: 'nav.academic',
      items: [
        { labelKey: 'nav.academicCenter', href: '/admin/academic', icon: '📐' },
        { labelKey: 'nav.homework', href: '/admin/homeworks', icon: '📝' },
        { labelKey: 'nav.resources', href: '/admin/resources', icon: '📚' },
        { labelKey: 'nav.timetable', href: '/admin/timetable', icon: '📅' },
        { labelKey: 'nav.exams', href: '/admin/exams', icon: '📋' },
        { labelKey: 'nav.results', href: '/admin/exam-results', icon: '📊' },
      ],
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

export function navForUser(user: CurrentUser): NavSection[] {
  switch (user.role) {
    case 'admin':
      return isConfiguredAdmin(user)
        ? adminNav(user)
        : [{ items: [{ labelKey: 'nav.dashboard', href: '/admin/dashboard', icon: '🏠' }] }];
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
