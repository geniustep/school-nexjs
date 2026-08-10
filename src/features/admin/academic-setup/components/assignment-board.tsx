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
  academicYears,
  canManage,
}: {
  classes: SchoolClass[];
  subjects: Subject[];
  academicYears: { id: number; name: string; is_current?: boolean }[];
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
  const [academicYearId, setAcademicYearId] = useState(() => {
    const requested = searchParams.get('academic_year_id');
    return requested ?? '';
  });

  const effectiveYearId = academicYearId || String(academicYears.find((year) => year.is_current)?.id ?? academicYears[0]?.id ?? '');

  const query = useMemo(() => {
    const q: Record<string, string | number> = { page, limit: 50 };
    if (effectiveYearId) q.academic_year_id = effectiveYearId;
    const classId = searchParams.get('class_id');
    const teacherId = searchParams.get('teacher_id');
    const subjectId = searchParams.get('subject_id');
    if (classId) q.class_id = classId;
    if (teacherId) q.teacher_id = teacherId;
    if (subjectId) q.subject_id = subjectId;
    return q;
  }, [searchParams, page, effectiveYearId]);

  const { assignments, loading, error, meta, reload } = useTeachingAssignments(query);
  const readinessState = useSetupReadiness(
    effectiveYearId ? { academic_year_id: effectiveYearId } : undefined,
  );
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
      <section className="academic-setup-assignment-hero" aria-labelledby="assignment-workspace-title">
        <div>
          <p className="academic-setup-assignment-hero__eyebrow">{t('admin.academicSetup.assignmentWorkspaceEyebrow')}</p>
          <h2 id="assignment-workspace-title">{t('admin.academicSetup.assignmentWorkspaceTitle')}</h2>
          <p>{t('admin.academicSetup.assignmentWorkspaceDescription')}</p>
        </div>
        {canManage ? (
          <button type="button" className="btn btn--primary" onClick={() => { setEditing(null); setPickMissing(null); setFormOpen(true); }}>
            <span aria-hidden>＋</span>
            {t('admin.academicSetup.addAssignment')}
          </button>
        ) : null}
      </section>

      <section className="academic-setup-assignment-stats" aria-label={t('admin.academicSetup.assignmentOverview')}>
        <div className="academic-setup-assignment-stat academic-setup-assignment-stat--primary">
          <span>{t('admin.academicSetup.assignedCount')}</span>
          <strong>{assignedCount}</strong>
          <small>{t('admin.academicSetup.assignedCountHint')}</small>
        </div>
        <div className="academic-setup-assignment-stat academic-setup-assignment-stat--warning">
          <span>{t('admin.academicSetup.missingCount')}</span>
          <strong>{missingIssues.length}</strong>
          <small>{t('admin.academicSetup.missingCountHint')}</small>
        </div>
        <div className="academic-setup-assignment-stat">
          <span>{t('admin.academicSetup.currentYear')}</span>
          <strong>{academicYears.find((year) => String(year.id) === effectiveYearId)?.name ?? '—'}</strong>
          <small>{t('admin.academicSetup.currentYearHint')}</small>
        </div>
      </section>

      <section className="academic-setup-assignment-controls">
        <div className="academic-toolbar academic-setup-assignment-toolbar">
          <label className="field assignment-workspace__year" style={{ margin: 0 }}>
            <span>{t('admin.academicSetup.academicYear')}</span>
            <select
              value={effectiveYearId}
              onChange={(event) => {
                setAcademicYearId(event.target.value);
                setPage(1);
                setEditing(null);
                setPickMissing(null);
                setFormOpen(false);
              }}
            >
              {academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
          </label>
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
        {readinessState.data?.academic_year ? (
          <p className="tiny muted academic-setup-assignment-controls__context" role="status">
            {t('admin.academicSetup.activeAcademicYear', { year: readinessState.data.academic_year.name })}
          </p>
        ) : null}
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
          <AssignmentByTeacher assignments={assignments} canManage={canManage} onEdit={(a) => { setEditing(a); setPickMissing(null); setFormOpen(true); }} />
        ) : (
          <AssignmentBySubject assignments={assignments} canManage={canManage} onEdit={(a) => { setEditing(a); setPickMissing(null); setFormOpen(true); }} />
        )}
      </Card>
      {pagination ? (
        <Pagination page={pagination.page} totalPages={pagination.total_pages} total={pagination.total} pageSize={pagination.page_size || 50} onPage={setPage} />
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
        academicYearId={effectiveYearId ? Number(effectiveYearId) : undefined}
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
