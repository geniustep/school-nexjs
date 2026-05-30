// Role-based navigation model. Items are filtered by permission AND admin
// scope so inaccessible sections never render (defence-in-depth alongside the
// server). The labels are plain school terms — no backend/Odoo vocabulary.

import type { CurrentUser } from '@/types/user';
import { hasPermission } from '@/lib/permissions/permissions';
import {
  canSeeChannels,
  canSeeStudentData,
  isConfiguredAdmin,
} from '@/lib/permissions/scope';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

function adminNav(user: CurrentUser): NavSection[] {
  const sections: NavSection[] = [
    { items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: '🏠' }] },
  ];

  // School-data sections require a scope that exposes student data.
  const dataItems: NavItem[] = [];
  if (canSeeStudentData(user)) {
    if (hasPermission(user, 'view_students'))
      dataItems.push({ label: 'Students', href: '/admin/students', icon: '🎓' });
    if (hasPermission(user, 'view_parents'))
      dataItems.push({ label: 'Parents', href: '/admin/parents', icon: '👪' });
    if (hasPermission(user, 'view_teachers'))
      dataItems.push({ label: 'Teachers', href: '/admin/teachers', icon: '👩‍🏫' });
    if (hasPermission(user, 'view_classes')) {
      dataItems.push({ label: 'Levels', href: '/admin/levels', icon: '📚' });
      dataItems.push({ label: 'Classes', href: '/admin/classes', icon: '🏫' });
      dataItems.push({ label: 'Subjects', href: '/admin/subjects', icon: '📖' });
    }
    if (hasPermission(user, 'view_attendance'))
      dataItems.push({ label: 'Attendance', href: '/admin/attendance', icon: '🗓️' });
  }
  if (dataItems.length) sections.push({ title: 'School', items: dataItems });

  if (canSeeChannels(user) && hasPermission(user, 'view_channels')) {
    sections.push({
      title: 'Communication',
      items: [{ label: 'Channels', href: '/admin/channels', icon: '💬' }],
    });
  }

  return sections;
}

function teacherNav(): NavSection[] {
  return [
    { items: [{ label: 'Dashboard', href: '/teacher/dashboard', icon: '🏠' }] },
    {
      title: 'Teaching',
      items: [
        { label: 'My Classes', href: '/teacher/classes', icon: '🏫' },
        { label: 'Attendance', href: '/teacher/attendance', icon: '🗓️' },
      ],
    },
    {
      title: 'Communication',
      items: [{ label: 'Channels', href: '/teacher/channels', icon: '💬' }],
    },
  ];
}

function parentNav(): NavSection[] {
  return [
    { items: [{ label: 'Dashboard', href: '/parent/dashboard', icon: '🏠' }] },
    {
      title: 'Family',
      items: [{ label: 'My Children', href: '/parent/children', icon: '👧' }],
    },
    {
      title: 'Communication',
      items: [{ label: 'Channels', href: '/parent/channels', icon: '💬' }],
    },
  ];
}

function studentNav(): NavSection[] {
  return [
    { items: [{ label: 'Dashboard', href: '/student/dashboard', icon: '🏠' }] },
    {
      title: 'Me',
      items: [
        { label: 'My Profile', href: '/student/profile', icon: '🧑‍🎓' },
        { label: 'My Attendance', href: '/student/attendance', icon: '🗓️' },
      ],
    },
    {
      title: 'Communication',
      items: [
        { label: 'Channels', href: '/student/channels', icon: '💬' },
        { label: 'Announcements', href: '/student/announcements', icon: '📣' },
      ],
    },
  ];
}

export function navForUser(user: CurrentUser): NavSection[] {
  switch (user.role) {
    case 'admin':
      // Unconfigured admin (no scope, not super): only the dashboard, which
      // itself shows a blocked state. Prevents linking into restricted data.
      return isConfiguredAdmin(user)
        ? adminNav(user)
        : [{ items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: '🏠' }] }];
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
