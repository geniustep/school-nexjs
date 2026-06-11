import type { SetupReadinessPayload, ReadinessStatus } from '@/types/academic-setup';
import type { Level } from '@/types/class';

export interface TrackLevelRef {
  id: number;
  supports_tracks: boolean;
}

export type GuidedStepId =
  | 'levels'
  | 'classes'
  | 'subjects'
  | 'teachers'
  | 'staff'
  | 'assignments'
  | 'review';

export type GuidedStepState =
  | 'not_started'
  | 'in_progress'
  | 'needs_attention'
  | 'completed'
  | 'blocked'
  | 'locked';

export interface GuidedStepContext {
  levels: Level[];
  classesCount: number;
  subjectsCount: number;
  tracksCount: number;
  teachersCount: number;
  staffCount: number;
  trackLevels: TrackLevelRef[];
  canManageClasses: boolean;
  canManageTeachers: boolean;
  canManageStaff: boolean;
  canManageAssignments: boolean;
  readiness: SetupReadinessPayload;
}

export interface GuidedStep {
  id: GuidedStepId;
  number: number;
  state: GuidedStepState;
  lockReasonKey: string | null;
  missingCount: number;
  summaryKey: string;
  summaryParams: Record<string, string | number>;
  href: string;
  available: boolean;
  actionKey: string;
}

const STEP_ROUTES: Record<GuidedStepId, string> = {
  levels: '/admin/settings/academic-setup/classes',
  classes: '/admin/settings/academic-setup/classes',
  subjects: '/admin/settings/academic-setup/subjects',
  teachers: '/admin/settings/academic-setup/teachers',
  staff: '/admin/settings/academic-setup/staff',
  assignments: '/admin/settings/academic-setup/assignments',
  review: '/admin/settings/academic-setup',
};

function mapDomainStatus(status: ReadinessStatus | undefined): GuidedStepState {
  switch (status) {
    case 'ready':
      return 'completed';
    case 'needs_attention':
      return 'needs_attention';
    case 'blocked':
      return 'blocked';
    case 'incomplete':
      return 'in_progress';
    case 'not_started':
    default:
      return 'not_started';
  }
}

function countIssuesForSection(
  readiness: SetupReadinessPayload,
  sections: string[],
): number {
  return readiness.issues.filter(
    (i) => i.blocking && sections.some((s) => i.target?.section === s || i.domain === s),
  ).length;
}

export function hasTrackSupportingLevel(trackLevels: TrackLevelRef[]): boolean {
  return trackLevels.some((l) => l.supports_tracks);
}

export function levelSupportsTracks(
  levelId: number,
  trackLevels: TrackLevelRef[],
): boolean {
  return trackLevels.some((l) => l.id === levelId && l.supports_tracks);
}

export function isLevelAlreadyEnabled(
  code: string,
  enabledLevels: Level[],
): boolean {
  const normalized = code.trim().toUpperCase();
  return enabledLevels.some((l) => (l.code ?? '').trim().toUpperCase() === normalized);
}

export function buildGuidedSteps(ctx: GuidedStepContext): GuidedStep[] {
  const { readiness, levels, classesCount, subjectsCount, tracksCount, teachersCount, staffCount } =
    ctx;
  const domains = readiness.domains;
  const levelsCount = levels.length;
  const hasLevels = levelsCount > 0;
  const hasClasses = classesCount > 0;
  const hasSubjects = subjectsCount > 0;
  const hasTeachers = teachersCount > 0;
  const hasTrackLevel = hasTrackSupportingLevel(ctx.trackLevels);

  const assignmentSummary = domains.assignments?.summary ?? {};
  const assigned = Number(assignmentSummary.assigned ?? 0);
  const missingAssignments = Number(assignmentSummary.missing ?? 0);

  const steps: GuidedStep[] = [
    {
      id: 'levels',
      number: 1,
      state: !hasLevels ? 'not_started' : mapDomainStatus(domains.levels_classes?.status),
      lockReasonKey: !ctx.canManageClasses ? 'admin.academicSetup.guided.lockNoPermission' : null,
      missingCount: hasLevels ? 0 : 1,
      summaryKey: 'admin.academicSetup.guided.summaryLevels',
      summaryParams: { count: levelsCount },
      href: `${STEP_ROUTES.levels}?action=add-levels`,
      available: ctx.canManageClasses,
      actionKey: 'admin.academicSetup.guided.actionAddLevels',
    },
    {
      id: 'classes',
      number: 2,
      state: !hasLevels
        ? 'locked'
        : !hasClasses
          ? 'not_started'
          : mapDomainStatus(domains.levels_classes?.status),
      lockReasonKey: !hasLevels ? 'admin.academicSetup.guided.lockNoLevels' : null,
      missingCount: countIssuesForSection(readiness, ['classes', 'levels']),
      summaryKey: 'admin.academicSetup.guided.summaryClasses',
      summaryParams: { count: classesCount },
      href: STEP_ROUTES.classes,
      available: hasLevels && ctx.canManageClasses,
      actionKey: 'admin.academicSetup.guided.actionAddClasses',
    },
    {
      id: 'subjects',
      number: 3,
      state: !hasLevels
        ? 'locked'
        : !hasSubjects
          ? 'not_started'
          : mapDomainStatus(domains.subjects_tracks?.status),
      lockReasonKey: !hasLevels ? 'admin.academicSetup.guided.lockNoLevels' : null,
      missingCount: countIssuesForSection(readiness, ['subjects', 'tracks']),
      summaryKey: 'admin.academicSetup.guided.summarySubjects',
      summaryParams: { subjects: subjectsCount, tracks: tracksCount },
      href: STEP_ROUTES.subjects,
      available: hasLevels && ctx.canManageClasses,
      actionKey: 'admin.academicSetup.guided.actionEnableSubjects',
    },
    {
      id: 'teachers',
      number: 4,
      state: !hasLevels
        ? 'locked'
        : !hasTeachers
          ? 'not_started'
          : mapDomainStatus(domains.teachers?.status),
      lockReasonKey: !hasLevels ? 'admin.academicSetup.guided.lockNoLevels' : null,
      missingCount: Number(domains.teachers?.summary?.without_assignments ?? 0),
      summaryKey: 'admin.academicSetup.guided.summaryTeachers',
      summaryParams: { count: teachersCount },
      href: `${STEP_ROUTES.teachers}?action=add`,
      available: hasLevels && ctx.canManageTeachers,
      actionKey: 'admin.academicSetup.guided.actionAddTeachers',
    },
    {
      id: 'staff',
      number: 5,
      state: mapDomainStatus(domains.staff?.status),
      lockReasonKey: !ctx.canManageStaff ? 'admin.academicSetup.guided.lockStaffReadOnly' : null,
      missingCount: Number(domains.staff?.summary?.incomplete ?? 0),
      summaryKey: 'admin.academicSetup.guided.summaryStaff',
      summaryParams: { count: staffCount },
      href: `${STEP_ROUTES.staff}?action=add`,
      available: true,
      actionKey: 'admin.academicSetup.guided.actionAddStaff',
    },
    {
      id: 'assignments',
      number: 6,
      state:
        !hasClasses || !hasSubjects || !hasTeachers
          ? 'locked'
          : missingAssignments > 0
            ? 'needs_attention'
            : assigned > 0
              ? 'completed'
              : 'not_started',
      lockReasonKey:
        !hasClasses || !hasSubjects || !hasTeachers
          ? 'admin.academicSetup.guided.lockAssignments'
          : null,
      missingCount: missingAssignments,
      summaryKey: 'admin.academicSetup.guided.summaryAssignments',
      summaryParams: { assigned, missing: missingAssignments },
      href: STEP_ROUTES.assignments,
      available:
        hasClasses && hasSubjects && hasTeachers && ctx.canManageAssignments,
      actionKey: 'admin.academicSetup.guided.actionAssignTeaching',
    },
    {
      id: 'review',
      number: 7,
      state: mapDomainStatus(readiness.readiness.status),
      lockReasonKey: null,
      missingCount: readiness.readiness.blocking_issues,
      summaryKey: 'admin.academicSetup.guided.summaryReview',
      summaryParams: { score: readiness.readiness.score },
      href: STEP_ROUTES.review,
      available: true,
      actionKey: 'admin.academicSetup.guided.actionReviewReadiness',
    },
  ];

  if (!hasTrackLevel) {
    const subjectsStep = steps.find((s) => s.id === 'subjects');
    if (subjectsStep && subjectsStep.state !== 'locked') {
      subjectsStep.summaryParams = { ...subjectsStep.summaryParams, tracksNote: 0 };
    }
  }

  return steps;
}

export function resolveNextStep(steps: GuidedStep[]): GuidedStep | null {
  const priority: GuidedStepState[] = [
    'not_started',
    'in_progress',
    'needs_attention',
    'blocked',
  ];

  for (const state of priority) {
    const step = steps.find((s) => s.state === state && s.available && s.id !== 'review');
    if (step) return step;
  }

  const review = steps.find((s) => s.id === 'review');
  if (review && review.missingCount > 0) return review;
  return review ?? null;
}

export function primaryCtaFromSteps(steps: GuidedStep[]): GuidedStep | null {
  return resolveNextStep(steps);
}

export function aggregateBatchResults<T extends { ok: boolean }>(
  results: T[],
): { allOk: boolean; successCount: number; failCount: number } {
  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.length - successCount;
  return { allOk: failCount === 0, successCount, failCount };
}

export function suggestClassNames(levelName: string, count: number): string[] {
  const suffixes = ['أ', 'ب', 'ج', 'د', 'ه', 'و'];
  return Array.from({ length: count }, (_, i) => {
    const suffix = suffixes[i] ?? String(i + 1);
    return `${levelName.trim()} ${suffix}`;
  });
}

export function clearTrackOnLevelChange(
  currentTrackId: string,
  nextLevelId: string,
  previousLevelId: string,
  trackLevels: TrackLevelRef[],
): string {
  if (!currentTrackId || nextLevelId === previousLevelId) return currentTrackId;
  const supports = levelSupportsTracks(Number(nextLevelId), trackLevels);
  return supports ? currentTrackId : '';
}
