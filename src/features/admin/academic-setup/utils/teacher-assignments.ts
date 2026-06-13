import {
  createTeachingAssignment,
  deleteTeachingAssignment,
  updateTeachingAssignment,
} from '../hooks/use-teaching-assignments';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { ApiResponse } from '@/types/api';

export type TeacherAssignmentDraft = {
  key: string;
  assignmentId?: number;
  classId: number;
  subjectId: number;
  weeklyHours: number;
};

export type AssignmentSyncResult = {
  ok: boolean;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
};

export function assignmentPairKey(classId: number, subjectId: number): string {
  return `${classId}:${subjectId}`;
}

export function isAssignmentDraftComplete(row: TeacherAssignmentDraft): boolean {
  return row.classId > 0 && row.subjectId > 0 && row.weeklyHours > 0;
}

export function findDuplicateAssignmentKey(rows: TeacherAssignmentDraft[]): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isAssignmentDraftComplete(row)) continue;
    const key = assignmentPairKey(row.classId, row.subjectId);
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

export function teachingAssignmentToDraft(assignment: TeachingAssignment): TeacherAssignmentDraft {
  return {
    key: `existing-${assignment.id}`,
    assignmentId: assignment.id,
    classId: assignment.class.id,
    subjectId: assignment.subject.id,
    weeklyHours: assignment.weekly_hours > 0 ? assignment.weekly_hours : 2,
  };
}

export function createEmptyAssignmentDraft(): TeacherAssignmentDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    classId: 0,
    subjectId: 0,
    weeklyHours: 2,
  };
}

export function normalizeAssignmentDrafts(rows: TeacherAssignmentDraft[]): TeacherAssignmentDraft[] {
  return rows.filter(isAssignmentDraftComplete);
}

function assignmentChanged(
  draft: TeacherAssignmentDraft,
  existing: TeachingAssignment | undefined,
): boolean {
  if (!existing) return true;
  return existing.weekly_hours !== draft.weeklyHours;
}

export async function syncTeacherAssignments(
  teacherId: number,
  desiredRows: TeacherAssignmentDraft[],
  existingAssignments: TeachingAssignment[],
): Promise<AssignmentSyncResult> {
  const desired = normalizeAssignmentDrafts(desiredRows);
  const existingById = new Map(existingAssignments.map((item) => [item.id, item]));
  const desiredExistingIds = new Set(
    desired.map((row) => row.assignmentId).filter((id): id is number => id != null),
  );

  const result: AssignmentSyncResult = {
    ok: true,
    created: 0,
    updated: 0,
    deleted: 0,
    errors: [],
  };

  for (const assignment of existingAssignments) {
    if (desiredExistingIds.has(assignment.id)) continue;
    const res = await deleteTeachingAssignment(assignment.id);
    if (!res.success) {
      result.ok = false;
      result.errors.push(res.error.message);
      continue;
    }
    result.deleted += 1;
  }

  for (const draft of desired) {
    if (draft.assignmentId != null) {
      const current = existingById.get(draft.assignmentId);
      if (!assignmentChanged(draft, current)) continue;
      const res = await updateTeachingAssignment(draft.assignmentId, {
        teacher_id: teacherId,
        weekly_hours: draft.weeklyHours,
        role: 'main',
      });
      if (!res.success) {
        result.ok = false;
        result.errors.push(res.error.message);
        continue;
      }
      result.updated += 1;
      continue;
    }

    const res = await createTeachingAssignment({
      class_id: draft.classId,
      subject_id: draft.subjectId,
      teacher_id: teacherId,
      weekly_hours: draft.weeklyHours,
      role: 'main',
    });
    if (!res.success) {
      result.ok = false;
      result.errors.push(res.error.message);
      continue;
    }
    result.created += 1;
  }

  return result;
}

export function extractTeachingAssignmentFromMutation(data: unknown): TeachingAssignment | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as { item?: TeachingAssignment; id?: number };
  if (record.item && typeof record.item.id === 'number') return record.item;
  if (typeof record.id === 'number') return record as TeachingAssignment;
  return null;
}

export function isTeacherProfilePayloadDirty(
  current: {
    name: string;
    code: string;
    phone: string;
    email: string;
    login: string;
    specialization: string;
  },
  original: {
    name: string;
    code: string;
    phone: string;
    email: string;
    login: string;
    specialization: string;
  },
): boolean {
  return (
    current.name.trim() !== original.name.trim() ||
    current.code.trim() !== original.code.trim() ||
    current.phone.trim() !== original.phone.trim() ||
    current.email.trim() !== original.email.trim() ||
    current.login.trim() !== original.login.trim() ||
    current.specialization.trim() !== original.specialization.trim()
  );
}

export function collectApiErrors(responses: ApiResponse<unknown>[]): string[] {
  return responses.filter((res) => !res.success).map((res) => res.error.message);
}
