'use client';

import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass } from '@/types/class';
import type { SetupReadinessIssue, TeachingAssignment } from '@/types/academic-setup';
import {
  createTeachingAssignment,
  deleteTeachingAssignment,
  updateTeachingAssignment,
  useTeachingAssignments,
} from '../hooks/use-teaching-assignments';
import { useSetupReadiness } from '../hooks/use-setup-readiness';
import { filterAssignmentMissingIssues, filterIssuesByQuery } from '../utils/section-routes';
import { mapAcademicSetupApiError, mapWarningCode } from '../utils/api-errors';
import { mapTeacherDomainError } from '@/features/admin/teachers/utils/teacher-domain-errors';
import { sanitizeUserFacingErrorMessage } from '@/lib/utils/user-facing-error';
import { AssignmentByClass } from './assignment-by-class';
import { AssignmentByTeacher } from './assignment-by-teacher';
import { AssignmentBySubject } from './assignment-by-subject';
import {
  AssignmentFormDrawer,
  type AssignmentFormCreatePayload,
  type AssignmentFormUpdatePayload,
} from './assignment-form-drawer';
import { MissingAssignmentsDrawer } from './missing-assignments-drawer';

export type AssignmentViewMode = 'class' | 'teacher' | 'subject';

export function AssignmentBoard({
  classes,
  canManage,
}: {
  classes: SchoolClass[];
  canManage: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const searchParams = useSearchParams();
  const [view, setView] = useState<AssignmentViewMode>('class');
  const [missingOpen, setMissingOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeachingAssignment | null>(null);
  const [pickMissing, setPickMissing] = useState<SetupReadinessIssue | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useMemo(() => {
    const q: Record<string, string | number> = { limit: 500 };
    const classId = searchParams.get('class_id');
    const teacherId = searchParams.get('teacher_id');
    const subjectId = searchParams.get('subject_id');
    if (classId) q.class_id = classId;
    if (teacherId) q.teacher_id = teacherId;
    if (subjectId) q.subject_id = subjectId;
    return q;
  }, [searchParams]);

  const { assignments, loading, error, reload } = useTeachingAssignments(query);
  const readinessState = useSetupReadiness();

  const missingIssues = useMemo(() => {
    const all = filterAssignmentMissingIssues(readinessState.data?.issues ?? []);
    return filterIssuesByQuery(all, searchParams);
  }, [readinessState.data?.issues, searchParams]);

  const invalidate = useCallback(() => {
    reload();
    readinessState.reload();
  }, [reload, readinessState]);

  function mapAssignmentMutationError(error: Parameters<typeof mapAcademicSetupApiError>[0]) {
    const domain = mapTeacherDomainError(error, t);
    if (domain && domain !== t('errors.generic')) return domain;
    return mapAcademicSetupApiError(error, t, 'assignment');
  }

  async function handleCreate(payload: AssignmentFormCreatePayload) {
    if (saving) return;
    setSaving(true);
    const res = await createTeachingAssignment(payload);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAssignmentMutationError(res.error));
      return;
    }
    res.data.warnings?.forEach((w) => toast.error(mapWarningCode(w.code, t)));
    toast.success(t('admin.saveSuccess'));
    setFormOpen(false);
    setPickMissing(null);
    invalidate();
  }

  async function handleUpdate(id: number, payload: AssignmentFormUpdatePayload) {
    if (saving) return;
    setSaving(true);
    const res = await updateTeachingAssignment(id, payload);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAssignmentMutationError(res.error));
      return;
    }
    res.data.warnings?.forEach((w) => toast.error(mapWarningCode(w.code, t)));
    toast.success(t('admin.saveSuccess'));
    setFormOpen(false);
    setEditing(null);
    invalidate();
  }

  async function handleDelete(assignment: TeachingAssignment) {
    if (!window.confirm(t('admin.academicSetup.confirmDeleteAssignment'))) return;
    setSaving(true);
    const res = await deleteTeachingAssignment(assignment.id);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'assignment'));
      return;
    }
    toast.success(t('admin.actionSuccess'));
    setFormOpen(false);
    setEditing(null);
    invalidate();
  }

  return (
    <div className="academic-setup-assignment-board">
      <div className="academic-toolbar academic-setup-assignment-toolbar">
        <div className="academic-setup-view-tabs" role="tablist">
          {(['class', 'teacher', 'subject'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={view === mode}
              className={`academic-setup-view-tab${view === mode ? ' academic-setup-view-tab--active' : ''}`}
              onClick={() => setView(mode)}
            >
              {t(`admin.academicSetup.viewBy.${mode}`)}
            </button>
          ))}
        </div>
        {missingIssues.length > 0 && canManage && (
          <button type="button" className="btn btn--primary btn--sm academic-setup-assignment-toolbar__cta" onClick={() => setMissingOpen(true)}>
            {t('admin.academicSetup.completeMissing')} ({missingIssues.length})
          </button>
        )}
      </div>

      <Card pad={false}>
        {loading ? (
          <p className="muted" style={{ padding: 14 }}>{t('common.loading')}</p>
        ) : error ? (
          <p className="muted" style={{ padding: 14 }}>
            {sanitizeUserFacingErrorMessage(error.message, t('errors.loadFailedRetry'))}
          </p>
        ) : view === 'class' ? (
          <AssignmentByClass
            classes={classes}
            assignments={assignments}
            missingIssues={missingIssues}
            canManage={canManage}
            onPickMissing={(issue) => {
              setPickMissing(issue);
              setEditing(null);
              setFormOpen(true);
            }}
            onEdit={(a) => {
              setEditing(a);
              setPickMissing(null);
              setFormOpen(true);
            }}
          />
        ) : view === 'teacher' ? (
          <AssignmentByTeacher assignments={assignments} />
        ) : (
          <AssignmentBySubject assignments={assignments} />
        )}
      </Card>

      <AssignmentFormDrawer
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setPickMissing(null);
        }}
        assignment={editing}
        missingIssue={pickMissing}
        canManage={canManage}
        saving={saving}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <MissingAssignmentsDrawer
        open={missingOpen}
        onClose={() => setMissingOpen(false)}
        issues={missingIssues}
        canManage={canManage}
        onPickIssue={(issue) => {
          setMissingOpen(false);
          setPickMissing(issue);
          setFormOpen(true);
        }}
        onConfirmCreate={handleCreate}
      />
    </div>
  );
}
