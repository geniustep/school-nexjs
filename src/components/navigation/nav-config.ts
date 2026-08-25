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
import { canViewTeachingPlanning } from '@/lib/permissions/teaching-planning';
import { canReviewCommunication } from '@/lib/permissions/communication';

export interface NavItem {
  labelKey: string;
  href: string;
  icon: string;
  isActive?: (pathname: string) => boolean;
}

export interface NavSection {
  titleKey?: string;
  groupId?: string;
  /** Optional group header icon (defaults to the first item icon). */
  icon?: string;
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
    labelKey: 'nav.adminToday',
    href: '/admin/dashboard',
    icon: '📊',
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
    icon: '🏠',
    titleKey: scopedNavTitle('nav.schoolLife', 'nav.scopedSchoolLife', scopedLabels),
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
    icon: '👥',
    titleKey: scopedNavTitle(
      'nav.registrationSchooling',
      'nav.scopedRegistrationSchooling',
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
    labelKey: 'nav.schoolTeam',
    href: '/admin/staff',
    icon: '🧑‍💼',
  });
  pushSection(sections, {
    groupId: 'staff',
    icon: '👔',
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
  pushIf(academicItems, canShowAdminNavPermission(user, 'view_timetable'), {
    labelKey: 'nav.schoolCalendarHolidays',
    href: '/admin/academic-calendars',
    icon: '📆',
  });
  pushIf(academicItems, canShowAdminNavPermission(user, 'view_timetable'), {
    labelKey: 'nav.regulatoryReferences',
    href: '/admin/regulatory',
    icon: '📜',
  });
  pushIf(
    academicItems,
    canShowAdminNavPermission(user, 'view_classes') &&
      canShowAdminNavPermission(user, 'view_teachers'),
    {
      labelKey: 'nav.subjectClassAssignments',
      href: '/admin/teaching-assignments',
      icon: '📎',
      isActive: (pathname) =>
        pathname === '/admin/teaching-assignments' ||
        pathname.startsWith('/admin/teaching-assignments/'),
    },
  );
  pushIf(academicItems, canViewTeachingPlanning(user), {
    labelKey: 'nav.teachingPlanning',
    href: '/admin/teaching-planning',
    icon: '📘',
  });
  pushSection(sections, {
    groupId: 'academic',
    defaultOpen: true,
    icon: '🏛️',
    titleKey: scopedNavTitle(
      'nav.pedagogicalOrganization',
      'nav.scopedPedagogicalOrganization',
      scopedLabels,
    ),
    items: academicItems,
  });

  const learningItems: NavItem[] = [];
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_homeworks'), {
    labelKey: 'nav.homework',
    href: '/admin/homeworks',
    icon: '📝',
  });
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_resources'), {
    labelKey: 'nav.educationalResources',
    href: '/admin/resources',
    icon: '📂',
  });
  pushIf(learningItems, canShowAdminNavPermission(user, 'library.view'), {
    labelKey: 'nav.library',
    href: '/admin/library',
    icon: '📚',
    isActive: (pathname) => pathname === '/admin/library' || pathname.startsWith('/admin/library/'),
  });
  pushIf(
    learningItems,
    canShowAdminNavPermission(user, 'entry_requirements.manage') ||
      canShowAdminNavPermission(user, 'entry_requirements.publish'),
    {
      labelKey: 'nav.booksSupplies',
      href: '/admin/entry-requirements',
      icon: '🎒',
      isActive: (pathname) => pathname === '/admin/entry-requirements' || pathname.startsWith('/admin/entry-requirements/'),
    },
  );
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_exams'), {
    labelKey: 'nav.examsAndTests',
    href: '/admin/exams',
    icon: '🧪',
    isActive: (pathname) =>
      pathname === '/admin/exams' ||
      (pathname.startsWith('/admin/exams/') && !pathname.includes('/results')),
  });
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_exam_results'), {
    labelKey: 'nav.examResultsNav',
    href: '/admin/exam-results',
    icon: '📑',
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
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_exams'), {
    labelKey: 'nav.diagnosticAssessment',
    href: '/admin/academics/assessment/diagnostic',
    icon: '🔬',
    isActive: (pathname) => pathname.startsWith('/admin/academics/assessment/diagnostic'),
  });
  pushIf(learningItems, canShowAdminNavPermission(user, 'view_exams'), {
    labelKey: 'nav.classResults',
    href: '/admin/academics/assessment/class-results',
    icon: '📈',
    isActive: (pathname) => pathname.startsWith('/admin/academics/assessment/class-results'),
  });
  pushSection(sections, {
    groupId: 'learning',
    icon: '🎯',
    titleKey: scopedNavTitle(
      'nav.teachingAssessment',
      'nav.scopedTeachingAssessment',
      scopedLabels,
    ),
    items: learningItems,
  });

  {
    const communicationItems: NavItem[] = [];
    communicationItems.push({
      labelKey: 'nav.announcementsCorrespondence',
      href: '/admin/announcements',
      icon: '📣',
      isActive: (pathname) => pathname.startsWith('/admin/announcements'),
    });
    pushIf(communicationItems, canReviewCommunication(user), {
      labelKey: 'nav.reviewApproval',
      href: '/admin/communication',
      icon: '☑️',
      isActive: (pathname) => {
        const base = pathname.split('?')[0];
        if (
          base === '/admin/communication/compose' ||
          base.startsWith('/admin/communication/compose/')
        ) {
          return false;
        }
        return pathname.startsWith('/admin/communication');
      },
    });
    pushIf(communicationItems, canReviewCommunication(user), {
      labelKey: 'nav.adminRequests',
      href: '/admin/admin-requests',
      icon: '📨',
      isActive: (pathname) => pathname.startsWith('/admin/admin-requests'),
    });
    pushIf(communicationItems, canShowAdminNavPermission(user, 'view_channels'), {
      labelKey: 'nav.communicationChannels',
      href: '/admin/channels',
      icon: '💬',
      isActive: (pathname) => pathname.startsWith('/admin/channels'),
    });
    const schoolComm = communicationItems.find((item) => item.href === '/admin/announcements');
    if (schoolComm) {
      schoolComm.isActive = (pathname) =>
        pathname.startsWith('/admin/announcements') ||
        pathname.startsWith('/admin/communication/compose');
    }
    pushSection(sections, {
      groupId: 'communication',
      icon: '📣',
      titleKey: scopedNavTitle('nav.communication', 'nav.adminScopedCommunication', scopedLabels),
      items: communicationItems,
    });
  }

  if (canShowAdminNavPermission(user, FINANCE_VIEW)) {
    pushSection(sections, {
      groupId: 'finance',
      icon: '🏦',
      titleKey: scopedNavTitle('nav.adminSchoolFinance', 'nav.scopedSchoolFinance', scopedLabels),
      items: [
        {
          labelKey: 'nav.adminSchoolFinance',
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
        icon: '🛠️',
        titleKey: scopedNavTitle('nav.institutionSettings', 'nav.scopedInstitutionSettings', scopedLabels),
        items: [
          {
            labelKey: 'nav.institutionSettings',
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
    { items: [{ labelKey: 'nav.teacherToday', href: '/teacher/dashboard', icon: '🏠' }] },
    {
      titleKey: 'teacher.myTeachingTasks',
      items: [
        { labelKey: 'nav.myClasses', href: '/teacher/classes', icon: '🏫' },
        { labelKey: 'nav.attendance', href: '/teacher/attendance', icon: '🗓️' },
        { labelKey: 'nav.timetable', href: '/teacher/timetable', icon: '📅' },
      ],
    },
    {
      titleKey: 'nav.teacherTeaching',
      items: [
        { labelKey: 'nav.homework', href: '/teacher/homeworks', icon: '📝' },
        { labelKey: 'nav.teacherResources', href: '/teacher/resources', icon: '📚' },
        { labelKey: 'nav.curriculumRequirements', href: '/teacher/entry-requirements', icon: '📘' },
      ],
    },
    {
      titleKey: 'nav.assessment',
      items: [
        {
          labelKey: 'nav.examsAndTests',
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
        {
          labelKey: 'nav.diagnosticAssessment',
          href: '/teacher/assessment/diagnostic',
          icon: '📝',
          isActive: (pathname) => pathname.startsWith('/teacher/assessment/diagnostic'),
        },
        { labelKey: 'nav.studentWork', href: '/teacher/submissions', icon: '📥' },
      ],
    },
    {
      titleKey: 'nav.communication',
      items: [
        { labelKey: 'nav.communicationChannels', href: '/teacher/channels', icon: '💬' },
        { labelKey: 'nav.announcements', href: '/teacher/announcements', icon: '📣' },
        {
          labelKey: 'nav.adminRequests',
          href: '/teacher/admin-requests',
          icon: '📨',
          isActive: (pathname) => pathname.startsWith('/teacher/admin-requests'),
        },
      ],
    },
    {
      titleKey: 'teacher.workspaceNavProfile',
      items: [{ labelKey: 'teacher.myProfileNav', href: '/teacher/profile', icon: '👤' }],
    },
  ];
}

function parentNav(): NavSection[] {
  return [
    { items: [{ labelKey: 'nav.parentToday', href: '/parent/dashboard', icon: '🏠' }] },
    {
      titleKey: 'nav.childrenAffairs',
      items: [
        { labelKey: 'nav.myChildren', href: '/parent/children', icon: '👧' },
        { labelKey: 'nav.booksSupplies', href: '/parent/entry-requirements', icon: '🎒' },
        { labelKey: 'nav.parentTuitionFees', href: '/parent/finance', icon: '💰' },
      ],
    },
    {
      titleKey: 'nav.communication',
      items: [
        { labelKey: 'nav.communicationChannels', href: '/parent/channels', icon: '💬' },
        { labelKey: 'nav.announcements', href: '/parent/announcements', icon: '📣' },
        { labelKey: 'nav.adminRequests', href: '/parent/admin-requests', icon: '📨' },
      ],
    },
  ];
}

function studentNav(): NavSection[] {
  return [
    { items: [{ labelKey: 'nav.studentToday', href: '/student/dashboard', icon: '🏠' }] },
    {
      titleKey: 'nav.myStudies',
      items: [
        { labelKey: 'nav.myProfile', href: '/student/profile', icon: '🧑‍🎓' },
        { labelKey: 'nav.attendance', href: '/student/attendance', icon: '🗓️' },
        { labelKey: 'nav.timetable', href: '/student/timetable', icon: '📅' },
        { labelKey: 'nav.library', href: '/student/library', icon: '📚' },
      ],
    },
    {
      titleKey: 'nav.communication',
      items: [
        { labelKey: 'nav.communicationChannels', href: '/student/channels', icon: '💬' },
        { labelKey: 'nav.announcements', href: '/student/announcements', icon: '📣' },
        { labelKey: 'nav.adminRequests', href: '/student/admin-requests', icon: '📨' },
      ],
    },
  ];
}

export const ADMIN_NAV_BY_PERMISSION: { permission: Permission; href: string; labelKey: string }[] = [
  { permission: 'view_dashboard', href: '/admin/dashboard', labelKey: 'nav.adminToday' },
  { permission: 'view_students', href: '/admin/students', labelKey: 'nav.students' },
  { permission: 'view_parents', href: '/admin/parents', labelKey: 'nav.parents' },
  { permission: 'view_teachers', href: '/admin/teachers', labelKey: 'nav.teachers' },
  { permission: 'view_classes', href: '/admin/classes', labelKey: 'nav.classes' },
  { permission: 'view_classes', href: '/admin/staff', labelKey: 'nav.schoolTeam' },
  { permission: 'view_attendance', href: '/admin/attendance', labelKey: 'nav.attendance' },
  { permission: 'view_channels', href: '/admin/channels', labelKey: 'nav.communicationChannels' },
  { permission: 'view_homeworks', href: '/admin/homeworks', labelKey: 'nav.homework' },
  { permission: 'view_resources', href: '/admin/resources', labelKey: 'nav.educationalResources' },
  { permission: 'library.view', href: '/admin/library', labelKey: 'nav.library' },
  { permission: 'entry_requirements.manage', href: '/admin/entry-requirements', labelKey: 'nav.booksSupplies' },
  { permission: 'view_exams', href: '/admin/exams', labelKey: 'nav.examsAndTests' },
  { permission: 'view_exam_results', href: '/admin/exam-results', labelKey: 'nav.examResultsNav' },
  { permission: 'view_timetable', href: '/admin/timetable', labelKey: 'nav.timetable' },
  { permission: 'view_timetable', href: '/admin/academic-calendars', labelKey: 'nav.schoolCalendarHolidays' },
  { permission: 'view_timetable', href: '/admin/regulatory', labelKey: 'nav.regulatoryReferences' },
  { permission: FINANCE_VIEW, href: '/admin/finance', labelKey: 'nav.adminSchoolFinance' },
];

export function navForUser(user: CurrentUser): NavSection[] {
  if (shouldUseTeacherWorkspace(user)) return teacherNav();

  switch (user.role) {
    case 'admin':
      if (!isConfiguredAdmin(user)) {
        return canAccessAdminDashboard(user)
          ? [{ items: [{ labelKey: 'nav.adminToday', href: '/admin/dashboard', icon: '📊' }] }]
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