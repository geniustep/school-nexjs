// Pedagogical director dashboard — metrics, actions, and nav hints from permissions only.

import { ADMISSION_VIEW } from '@/lib/permissions/admission';
import { canViewAcademicSetup, canAccessStaffCenter } from '@/lib/permissions/academic-setup';
import { canViewFinance } from '@/lib/permissions/finance';
import { hasPermission } from '@/lib/permissions/permissions';
import { isPedagogicalDirector, hasAcademicWorkspacePermissions } from '@/lib/admin/admin-ux';
import type { CurrentUser } from '@/types/user';

export type PedagogicalDashboardMetricId =
  | 'students'
  | 'admissions'
  | 'parents'
  | 'teachers'
  | 'staffCenter'
  | 'classes'
  | 'levels'
  | 'subjects'
  | 'attendance'
  | 'timetable'
  | 'homeworks'
  | 'resources'
  | 'exams'
  | 'examResults'
  | 'reports';

export type PedagogicalDashboardMetricGroupId =
  | 'schoolLife'
  | 'academicOrg'
  | 'learningAssessment'
  | 'team';

export type PedagogicalDashboardActionId =
  | 'attendance'
  | 'teachers'
  | 'classes'
  | 'examResults'
  | 'timetable'
  | 'students'
  | 'admissions'
  | 'parents'
  | 'levels'
  | 'subjects'
  | 'homeworks'
  | 'resources'
  | 'exams'
  | 'channels'
  | 'staffCenter'
  | 'academicSetup';

export interface PedagogicalDashboardMetric {
  id: PedagogicalDashboardMetricId;
  labelKey: string;
  hintKey: string;
  href: string;
  icon: string;
  emptyKey: string;
}

export interface PedagogicalDashboardMetricGroup {
  id: PedagogicalDashboardMetricGroupId;
  titleKey: string;
  metricIds: PedagogicalDashboardMetricId[];
}

export interface PedagogicalDashboardAction {
  id: PedagogicalDashboardActionId;
  labelKey: string;
  descriptionKey: string;
  href: string;
  icon: string;
  primary: boolean;
}

const METRIC_DEFINITIONS: PedagogicalDashboardMetric[] = [
  {
    id: 'students',
    labelKey: 'nav.students',
    hintKey: 'admin.pedagogicalDashboard.metricHint.students',
    href: '/admin/students',
    icon: '🎓',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.students',
  },
  {
    id: 'admissions',
    labelKey: 'nav.admissions',
    hintKey: 'admin.pedagogicalDashboard.metricHint.admissions',
    href: '/admin/admissions',
    icon: '📋',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.admissions',
  },
  {
    id: 'parents',
    labelKey: 'nav.parents',
    hintKey: 'admin.pedagogicalDashboard.metricHint.parents',
    href: '/admin/parents',
    icon: '👪',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.parents',
  },
  {
    id: 'attendance',
    labelKey: 'admin.pedagogicalDashboard.metrics.attendanceToday',
    hintKey: 'admin.pedagogicalDashboard.metricHint.attendance',
    href: '/admin/attendance?date=today',
    icon: '🗓️',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.attendance',
  },
  {
    id: 'classes',
    labelKey: 'nav.classes',
    hintKey: 'admin.pedagogicalDashboard.metricHint.classes',
    href: '/admin/classes',
    icon: '🏫',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.classes',
  },
  {
    id: 'levels',
    labelKey: 'nav.levels',
    hintKey: 'admin.pedagogicalDashboard.metricHint.levels',
    href: '/admin/levels',
    icon: '📚',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.levels',
  },
  {
    id: 'subjects',
    labelKey: 'nav.subjects',
    hintKey: 'admin.pedagogicalDashboard.metricHint.subjects',
    href: '/admin/subjects',
    icon: '📖',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.subjects',
  },
  {
    id: 'timetable',
    labelKey: 'nav.timetable',
    hintKey: 'admin.pedagogicalDashboard.metricHint.timetable',
    href: '/admin/timetable',
    icon: '📅',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.timetable',
  },
  {
    id: 'homeworks',
    labelKey: 'nav.homework',
    hintKey: 'admin.pedagogicalDashboard.metricHint.homeworks',
    href: '/admin/homeworks',
    icon: '📝',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.homeworks',
  },
  {
    id: 'resources',
    labelKey: 'nav.resources',
    hintKey: 'admin.pedagogicalDashboard.metricHint.resources',
    href: '/admin/resources',
    icon: '📚',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.resources',
  },
  {
    id: 'exams',
    labelKey: 'nav.exams',
    hintKey: 'admin.pedagogicalDashboard.metricHint.exams',
    href: '/admin/exams',
    icon: '📋',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.exams',
  },
  {
    id: 'examResults',
    labelKey: 'nav.examResultsNav',
    hintKey: 'admin.pedagogicalDashboard.metricHint.examResults',
    href: '/admin/exam-results',
    icon: '📊',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.examResults',
  },
  {
    id: 'reports',
    labelKey: 'admin.pedagogicalDashboard.reports',
    hintKey: 'admin.pedagogicalDashboard.metricHint.reports',
    href: '/admin/settings/academic-setup',
    icon: '📈',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.reports',
  },
  {
    id: 'teachers',
    labelKey: 'nav.teachers',
    hintKey: 'admin.pedagogicalDashboard.metricHint.teachers',
    href: '/admin/teachers',
    icon: '👩‍🏫',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.teachers',
  },
  {
    id: 'staffCenter',
    labelKey: 'nav.staffCenter',
    hintKey: 'admin.pedagogicalDashboard.metricHint.staffCenter',
    href: '/admin/staff',
    icon: '🧑‍💼',
    emptyKey: 'admin.pedagogicalDashboard.metricEmpty.staffCenter',
  },
];

const METRIC_GROUPS: PedagogicalDashboardMetricGroup[] = [
  {
    id: 'schoolLife',
    titleKey: 'admin.pedagogicalDashboard.metricGroups.schoolLife',
    metricIds: ['students', 'parents', 'admissions', 'attendance'],
  },
  {
    id: 'academicOrg',
    titleKey: 'admin.pedagogicalDashboard.metricGroups.academicOrg',
    metricIds: ['classes', 'levels', 'subjects', 'timetable'],
  },
  {
    id: 'learningAssessment',
    titleKey: 'admin.pedagogicalDashboard.metricGroups.learningAssessment',
    metricIds: ['homeworks', 'resources', 'exams', 'examResults', 'reports'],
  },
  {
    id: 'team',
    titleKey: 'admin.pedagogicalDashboard.metricGroups.team',
    metricIds: ['teachers', 'staffCenter'],
  },
];

const PRIMARY_ACTION_ORDER: PedagogicalDashboardActionId[] = [
  'attendance',
  'teachers',
  'classes',
  'examResults',
  'timetable',
  'students',
];

const ACTION_DEFINITIONS: Omit<PedagogicalDashboardAction, 'primary'>[] = [
  {
    id: 'attendance',
    labelKey: 'admin.pedagogicalDashboard.actions.attendance',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.attendance',
    href: '/admin/attendance?date=today',
    icon: '🗓️',
  },
  {
    id: 'teachers',
    labelKey: 'admin.pedagogicalDashboard.actions.teachers',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.teachers',
    href: '/admin/teachers',
    icon: '👩‍🏫',
  },
  {
    id: 'classes',
    labelKey: 'admin.pedagogicalDashboard.actions.classes',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.classes',
    href: '/admin/classes',
    icon: '🏫',
  },
  {
    id: 'examResults',
    labelKey: 'admin.pedagogicalDashboard.actions.examResults',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.examResults',
    href: '/admin/exam-results',
    icon: '📊',
  },
  {
    id: 'timetable',
    labelKey: 'admin.pedagogicalDashboard.actions.timetable',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.timetable',
    href: '/admin/timetable',
    icon: '📅',
  },
  {
    id: 'students',
    labelKey: 'admin.pedagogicalDashboard.actions.students',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.students',
    href: '/admin/students',
    icon: '🎓',
  },
  {
    id: 'admissions',
    labelKey: 'admin.pedagogicalDashboard.actions.admissions',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.admissions',
    href: '/admin/admissions',
    icon: '📋',
  },
  {
    id: 'parents',
    labelKey: 'admin.pedagogicalDashboard.actions.parents',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.parents',
    href: '/admin/parents',
    icon: '👪',
  },
  {
    id: 'levels',
    labelKey: 'admin.pedagogicalDashboard.actions.levels',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.levels',
    href: '/admin/levels',
    icon: '📚',
  },
  {
    id: 'subjects',
    labelKey: 'admin.pedagogicalDashboard.actions.subjects',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.subjects',
    href: '/admin/subjects',
    icon: '📖',
  },
  {
    id: 'homeworks',
    labelKey: 'admin.pedagogicalDashboard.actions.homeworks',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.homeworks',
    href: '/admin/homeworks',
    icon: '📝',
  },
  {
    id: 'resources',
    labelKey: 'admin.pedagogicalDashboard.actions.resources',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.resources',
    href: '/admin/resources',
    icon: '📚',
  },
  {
    id: 'exams',
    labelKey: 'admin.pedagogicalDashboard.actions.exams',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.exams',
    href: '/admin/exams',
    icon: '📋',
  },
  {
    id: 'channels',
    labelKey: 'admin.pedagogicalDashboard.actions.channels',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.channels',
    href: '/admin/channels',
    icon: '💬',
  },
  {
    id: 'staffCenter',
    labelKey: 'admin.pedagogicalDashboard.actions.staffCenter',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.staffCenter',
    href: '/admin/staff',
    icon: '🧑‍💼',
  },
  {
    id: 'academicSetup',
    labelKey: 'admin.pedagogicalDashboard.actions.academicSetup',
    descriptionKey: 'admin.pedagogicalDashboard.actionDesc.academicSetup',
    href: '/admin/settings/academic-setup',
    icon: '⚙️',
  },
];

function metricAllowed(user: CurrentUser, id: PedagogicalDashboardMetricId): boolean {
  switch (id) {
    case 'students':
      return hasPermission(user, 'view_students');
    case 'admissions':
      return hasPermission(user, ADMISSION_VIEW);
    case 'parents':
      return hasPermission(user, 'view_parents');
    case 'teachers':
      return hasPermission(user, 'view_teachers');
    case 'classes':
    case 'levels':
    case 'subjects':
      return hasPermission(user, 'view_classes');
    case 'attendance':
      return hasPermission(user, 'view_attendance');
    case 'timetable':
      return hasPermission(user, 'view_timetable');
    case 'homeworks':
      return hasPermission(user, 'view_homeworks');
    case 'resources':
      return hasPermission(user, 'view_resources');
    case 'exams':
      return hasPermission(user, 'view_exams');
    case 'examResults':
      return hasPermission(user, 'view_exam_results');
    case 'reports':
      return hasPermission(user, 'view_reports');
    case 'staffCenter':
      return canAccessStaffCenter(user);
    default:
      return false;
  }
}

function actionAllowed(user: CurrentUser, id: PedagogicalDashboardActionId): boolean {
  switch (id) {
    case 'students':
      return hasPermission(user, 'view_students');
    case 'admissions':
      return hasPermission(user, ADMISSION_VIEW);
    case 'parents':
      return hasPermission(user, 'view_parents');
    case 'teachers':
      return hasPermission(user, 'view_teachers');
    case 'classes':
    case 'levels':
    case 'subjects':
      return hasPermission(user, 'view_classes');
    case 'attendance':
      return hasPermission(user, 'view_attendance');
    case 'timetable':
      return hasPermission(user, 'view_timetable');
    case 'homeworks':
      return hasPermission(user, 'view_homeworks');
    case 'resources':
      return hasPermission(user, 'view_resources');
    case 'exams':
      return hasPermission(user, 'view_exams');
    case 'examResults':
      return hasPermission(user, 'view_exam_results');
    case 'channels':
      return hasPermission(user, 'view_channels');
    case 'staffCenter':
      return canAccessStaffCenter(user);
    case 'academicSetup':
      return canViewAcademicSetup(user);
    default:
      return false;
  }
}

/** Dedicated pedagogical dashboard and wide academic navigation. */
export function shouldUsePedagogicalDashboard(user: CurrentUser | null): boolean {
  if (!user || user.role !== 'admin') return false;
  if (isPedagogicalDirector(user)) return true;
  if (user.admin_kind === 'general_supervisor' || user.admin_kind === 'admin_staff') {
    return false;
  }
  if (canViewFinance(user)) return false;
  return hasAcademicWorkspacePermissions(user);
}

export const shouldUsePedagogicalNav = shouldUsePedagogicalDashboard;

export function resolvePedagogicalDashboardMetrics(
  user: CurrentUser,
): PedagogicalDashboardMetric[] {
  return METRIC_DEFINITIONS.filter((item) => metricAllowed(user, item.id));
}

export function resolvePedagogicalDashboardMetricGroups(user: CurrentUser): {
  id: PedagogicalDashboardMetricGroupId;
  titleKey: string;
  metrics: PedagogicalDashboardMetric[];
}[] {
  const allowed = new Set(resolvePedagogicalDashboardMetrics(user).map((item) => item.id));
  const byId = new Map(METRIC_DEFINITIONS.map((item) => [item.id, item]));

  return METRIC_GROUPS.map((group) => ({
    id: group.id,
    titleKey: group.titleKey,
    metrics: group.metricIds
      .filter((id) => allowed.has(id))
      .map((id) => byId.get(id)!)
      .filter(Boolean),
  })).filter((group) => group.metrics.length > 0);
}

export function resolvePedagogicalDashboardActions(user: CurrentUser): {
  primary: PedagogicalDashboardAction[];
  secondary: PedagogicalDashboardAction[];
} {
  const allowedIds = new Set(
    ACTION_DEFINITIONS.filter((item) => actionAllowed(user, item.id)).map((item) => item.id),
  );
  const byId = new Map(ACTION_DEFINITIONS.map((item) => [item.id, item]));

  const primary = PRIMARY_ACTION_ORDER.filter((id) => allowedIds.has(id))
    .slice(0, 6)
    .map((id) => ({ ...byId.get(id)!, primary: true }));

  const secondary = ACTION_DEFINITIONS.filter(
    (item) => allowedIds.has(item.id) && !primary.some((action) => action.id === item.id),
  ).map((item) => ({ ...item, primary: false }));

  return { primary, secondary };
}

/** @deprecated Use resolvePedagogicalDashboardActions */
export function resolvePedagogicalDashboardQuickActions(user: CurrentUser) {
  const { primary, secondary } = resolvePedagogicalDashboardActions(user);
  return [...primary, ...secondary].map((item) => ({
    id: item.id,
    labelKey: item.labelKey,
    href: item.href,
    icon: item.icon,
  }));
}

export const PEDAGOGICAL_NAV_GROUP_IDS = [
  'ops',
  'students',
  'staff',
  'academic',
  'learning',
  'communication',
] as const;

/** Expected nav shape for tests — mirrors permission-filtered admin nav groups. */
export function resolvePedagogicalNavExpectation(user: CurrentUser) {
  const sections: { groupId: string; titleKey: string; items: { labelKey: string }[] }[] = [];

  const ops: { labelKey: string }[] = [];
  if (hasPermission(user, 'view_dashboard') || shouldUsePedagogicalDashboard(user)) {
    ops.push({ labelKey: 'nav.dashboard' });
  }
  if (hasPermission(user, 'view_attendance')) ops.push({ labelKey: 'nav.attendance' });
  if (ops.length) {
    sections.push({ groupId: 'ops', titleKey: 'nav.adminOperations', items: ops });
  }

  const students: { labelKey: string }[] = [];
  if (hasPermission(user, ADMISSION_VIEW)) students.push({ labelKey: 'nav.admissions' });
  if (hasPermission(user, 'view_students')) students.push({ labelKey: 'nav.students' });
  if (hasPermission(user, 'view_parents')) students.push({ labelKey: 'nav.parents' });
  if (students.length) {
    sections.push({
      groupId: 'students',
      titleKey: 'nav.adminStudentsRegistration',
      items: students,
    });
  }

  const staff: { labelKey: string }[] = [];
  if (hasPermission(user, 'view_teachers')) staff.push({ labelKey: 'nav.teachers' });
  if (hasPermission(user, 'view_teachers') || hasPermission(user, 'view_classes')) {
    staff.push({ labelKey: 'nav.staffCenter' });
  }
  if (staff.length) {
    sections.push({ groupId: 'staff', titleKey: 'nav.adminSchoolStaff', items: staff });
  }

  const academic: { labelKey: string }[] = [];
  if (hasPermission(user, 'view_classes')) {
    academic.push(
      { labelKey: 'nav.classes' },
      { labelKey: 'nav.levels' },
      { labelKey: 'nav.subjects' },
    );
  }
  if (hasPermission(user, 'view_timetable')) academic.push({ labelKey: 'nav.timetable' });
  if (academic.length) {
    sections.push({ groupId: 'academic', titleKey: 'nav.adminAcademicSetup', items: academic });
  }

  const learning: { labelKey: string }[] = [];
  if (hasPermission(user, 'view_homeworks')) learning.push({ labelKey: 'nav.homework' });
  if (hasPermission(user, 'view_resources')) learning.push({ labelKey: 'nav.resources' });
  if (hasPermission(user, 'view_exams')) learning.push({ labelKey: 'nav.exams' });
  if (hasPermission(user, 'view_exam_results')) learning.push({ labelKey: 'nav.examResultsNav' });
  if (learning.length) {
    sections.push({
      groupId: 'learning',
      titleKey: 'nav.adminLearningAssessment',
      items: learning,
    });
  }

  if (hasPermission(user, 'view_channels')) {
    sections.push({
      groupId: 'communication',
      titleKey: 'nav.communication',
      items: [{ labelKey: 'nav.channels' }],
    });
  }

  return sections;
}
