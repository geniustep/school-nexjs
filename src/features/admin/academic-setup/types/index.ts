import type { Ref } from '@/types/api';
import type { Level, SchoolClass, Subject } from '@/types/class';
import type { Teacher } from '@/types/teacher';

export type SetupIssueSeverity = 'error' | 'warning' | 'info';

export type SetupIssueType =
  | 'level_without_classes'
  | 'class_without_subjects'
  | 'subject_without_teacher'
  | 'teacher_without_subjects'
  | 'teacher_without_assignments'
  | 'staff_without_account'
  | 'class_without_room'
  | 'teacher_high_workload'
  | 'teacher_incomplete_profile'
  | 'no_levels'
  | 'no_classes'
  | 'no_teachers';

export type SetupEntityType = 'level' | 'class' | 'subject' | 'teacher' | 'staff' | 'track';

export interface SetupIssue {
  id: string;
  type: SetupIssueType;
  severity: SetupIssueSeverity;
  title: string;
  description?: string;
  entityType: SetupEntityType;
  entityId: number | string;
  targetRoute: string;
  query?: Record<string, string>;
  blocksReadiness: boolean;
}

export interface SetupReadiness {
  percent: number;
  blockingCount: number;
  warningCount: number;
  infoCount: number;
  totalChecks: number;
  completedChecks: number;
  hasData: boolean;
}

export interface SetupSummaryCounts {
  levels: number;
  classes: number;
  classesNeedReview: number;
  activeSubjects: number;
  tracks: number;
  unlinkedSubjects: number;
  teachers: number;
  activeTeachers: number;
  incompleteTeachers: number;
  teachersWithoutAssignments: number;
  staff: number;
  staffManagers: number;
  inactiveStaff: number;
  assignments: number;
  subjectsWithoutTeacher: number;
  highLoadTeachers: number;
  incompleteClasses: number;
}

export interface DerivedAssignment {
  id: string;
  classId: number;
  className: string;
  levelId: number | null;
  levelName: string | null;
  subjectId: number;
  subjectName: string;
  teacherId: number | null;
  teacherName: string | null;
  status: 'assigned' | 'unassigned';
}

export type TeacherSuggestionTier =
  | 'best'
  | 'suitable'
  | 'review'
  | 'not_recommended'
  | 'ineligible';

export interface TeacherSuggestion {
  teacher: Teacher;
  tier: TeacherSuggestionTier;
  reasons: string[];
  classCount: number;
  teachesSubject: boolean;
  inClass: boolean;
}

export interface AcademicSetupData {
  levels: Level[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
}

export interface GlobalSearchResult {
  id: string;
  type: SetupEntityType;
  entityId: number;
  label: string;
  hint?: string;
  href: string;
  query?: Record<string, string>;
}

export interface LevelGroup extends Level {
  classes: SchoolClass[];
  studentCount: number;
  needsReview: number;
}

export interface SubjectLevelGroup {
  levelId: number | null;
  levelName: string;
  subjects: Subject[];
}

export type TeacherStatusKey =
  | 'complete'
  | 'needs_info'
  | 'no_assignment'
  | 'high_load'
  | 'inactive';

export interface TeacherCardModel {
  teacher: Teacher;
  status: TeacherStatusKey;
  classCount: number;
  assignmentCount: number;
  subjectNames: string[];
}

export interface AcademicSetupBundle {
  levels: Level[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  assignments: DerivedAssignment[];
  issues: SetupIssue[];
  readiness: SetupReadiness;
  summary: SetupSummaryCounts;
  loading: boolean;
  error: string | null;
  reload: () => void;
}
