'use client';

import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/primitives';
import { Pagination } from '@/components/tables/data-table';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import type { SchoolClass, Subject } from '@/types/class';
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
import '../assignment-workspace-refresh.css';

export type AssignmentViewMode = 'class' | 'teacher' | 'subject';

export function AssignmentBoard({
  classes,
  subjects,
  academicYearId,
  canManage,
}: {
  classes: SchoolClass[];
  subjects: Subject[];
  academicYearId: number;
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
  const [page, setPage] = useState(1);
  const effectiveYearId = String(academicYearId);

  const query = useMemo(() => {
    const q: Record<string, string | number> = {
      page,
      limit: 50,
      academic_year_id: effectiveYearId,
    };
    const classId = searchParams.get('class_id');
    const teacherId = searchParams.get('teacher_id');
    const subjectId = searchParams.get('subject_id');
    if (classId) q.class_id = classId;
    if (teacherId) q.teacher_id = teacherId;
    if (subjectId) q.subject_id = subjectId;
    return q;
  }, [searchParams, page, effectiveYearId]);

  const { assignments, loading, error, meta, reload } = useTeachingAssignments(query);
  const readinessState = useSetupReadiness({ academic_year_id: effectiveYearId });
  const pagination = meta?.pagination;
  const assignedCount = pagination?.total ?? assignments.length;

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

  function showMutationWarnings(warnings: Array<{ code: string; severity?: 'warning' | 'error' | 'info' }> | undefined) {
    warnings?.forEach((warning) => {
      const message = mapWarningCode(warning.code, t);
      if (warning.severity === 'error') {
        toast.error(message);
      } else if (warning.severity === 'info') {
        toast.show(message, 'info');
      } else {
        toast.warning(message);
      }
    });
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
    showMutationWarnings(res.data.warnings);
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
    showMutationWarnings(res.data.warnings);
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
    toast.success(
      res.data.action === 'deleted'
        ? t('admin.academicSetup.assignmentDeleted')
        : t('admin.academicSetup.assignmentDeactivated'),
    );
    setFormOpen(false);
    setEditing(null);
    invalidate();
  }

  return (
    <div className="academic-setup-assignment-board assignment-workspace">
      <section className="academic-setup-assignment-controls">
        <div className="academic-toolbar academic-setup-assignment-toolbar">
          <div className="academic-setup-assignment-toolbar__summary" aria-live="polite">
            <strong>{assignedCount}</strong>
            <span className="muted">{t('admin.academicSetup.assignedCount')}</span>
            {missingIssues.length > 0 ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setMissingOpen(true)}
                disabled={!canManage}
              >
                {t('admin.academicSetup.completeMissing')} ({missingIssues.length})
              </button>
            ) : null}
          </div>

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

          {canManage ? (
            <button
              type="button"
              className="btn btn--primary btn--sm academic-setup-assignment-toolbar__cta"
              onClick={() => {
                setEditing(null);
                setPickMissing(null);
                setFormOpen(true);
              }}
            >
              <span aria-hidden>＋</span>
              {t('admin.academicSetup.addAssignment')}
            </button>
          ) : null}
        </div>
      </section>

      <Card pad={false} className="academic-setup-assignment-results assignment-workspace__results">
        {loading ? (
          <p className="muted assignment-workspace__empty">{t('common.loading')}</p>
        ) : error ? (
          <p className="muted assignment-workspace__empty">
            {sanitizeUserFacingErrorMessage(error.message, t('errors.loadFailedRetry'))}
          </p>
        ) : view === 'class' ? (
          <AssignmentByClass
            classes={classes}
            subjects={subjects}
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
          <AssignmentByTeacher
            assignments={assignments}
            canManage={canManage}
            onEdit={(a) => {
              setEditing(a);
              setPickMissing(null);
              setFormOpen(true);
            }}
          />
        ) : (
          <AssignmentBySubject
            assignments={assignments}
            canManage={canManage}
            onEdit={(a) => {
              setEditing(a);
              setPickMissing(null);
              setFormOpen(true);
            }}
          />
        )}
      </Card>

      {pagination ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          pageSize={pagination.page_size || 50}
          onPage={setPage}
        />
      ) : null}

      <AssignmentFormDrawer
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setPickMissing(null);
        }}
        assignment={editing}
        missingIssue={pickMissing}
        classes={classes}
        subjects={subjects}
        academicYearId={academicYearId}
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
