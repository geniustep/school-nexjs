/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { EmptyState, LoadingState } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { DiagnosticAssessmentDetail, DiagnosticCompletion } from '@/types/diagnostic-assessment';
import {
  confirmDiagnosticAssessment,
  patchDiagnosticLines,
  postAdminDiagnosticRoster,
  resetAdminDiagnosticAssessment,
} from '../api/diagnostic-assessment-api';
import {
  buildLinesPatchPayload,
  canEditDiagnosticLines,
  countDirtyDrafts,
  defaultDraftFromLine,
  type DiagnosticWorkspaceRole,
  type LineDraftValue,
} from '../utils/diagnostic-draft';
import { normalizeDiagnosticAllowedActions, normalizeDiagnosticDetail } from '../utils/diagnostic-normalize';
import { DiagnosticCompletionPanel } from './diagnostic-completion-panel';
import { DiagnosticEntryGrid } from './diagnostic-entry-grid';
import '../diagnostic-assessment-workspace.css';

export function DiagnosticAssessmentDetailWorkspace({
  assessmentId,
  role = 'admin',
}: {
  assessmentId: string;
  role?: DiagnosticWorkspaceRole;
}) {
  const t = useT();
  const toast = useToast();
  const isTeacher = role === 'teacher';
  const listHref = isTeacher
    ? '/teacher/assessment/diagnostic'
    : '/admin/academics/assessment/diagnostic';
  const printHref = `${listHref}/${assessmentId}/print`;
  const detailPath = isTeacher
    ? endpoints.teacher.diagnosticAssessment(assessmentId)
    : endpoints.admin.diagnosticAssessment(assessmentId);

  const adminState = useAdminResource<DiagnosticAssessmentDetail>(isTeacher ? null : detailPath);
  const teacherState = useResource<DiagnosticAssessmentDetail>(isTeacher ? detailPath : null);
  const state = isTeacher ? teacherState : adminState;

  const detail = useMemo(
    () => (state.data ? normalizeDiagnosticDetail(state.data) : null),
    [state.data],
  );

  const [baselines, setBaselines] = useState(() => new Map<number, LineDraftValue>());
  const [drafts, setDrafts] = useState(() => new Map<number, LineDraftValue>());
  const [completion, setCompletion] = useState<DiagnosticCompletion | null>(null);
  const [allowedActions, setAllowedActions] = useState(() =>
    normalizeDiagnosticAllowedActions(detail?.allowed_actions),
  );
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!detail) return;
    const nextBaselines = new Map<number, LineDraftValue>();
    const nextDrafts = new Map<number, LineDraftValue>();
    for (const line of detail.lines) {
      const draft = defaultDraftFromLine(line);
      nextBaselines.set(line.id, draft);
      nextDrafts.set(line.id, { ...draft });
    }
    setBaselines(nextBaselines);
    setDrafts(nextDrafts);
    setCompletion(detail.completion);
    setAllowedActions(normalizeDiagnosticAllowedActions(detail.allowed_actions));
  }, [detail]);

  const dirtyCount = useMemo(() => countDirtyDrafts(baselines, drafts), [baselines, drafts]);
  const canEdit = canEditDiagnosticLines(role, allowedActions);

  const handleDraftChange = useCallback(
    (lineId: number, value: LineDraftValue) => {
      if (!canEdit) return;
      setDrafts((current) => {
        const next = new Map(current);
        next.set(lineId, value);
        return next;
      });
    },
    [canEdit],
  );

  function discardChanges() {
    const next = new Map<number, LineDraftValue>();
    for (const [lineId, baseline] of baselines) {
      next.set(lineId, { ...baseline });
    }
    setDrafts(next);
  }

  async function saveChanges() {
    const lines = buildLinesPatchPayload(baselines, drafts);
    if (!lines.length) return;
    setSaving(true);
    const res = await patchDiagnosticLines({
      role,
      id: assessmentId,
      payload: { lines },
    });
    setSaving(false);
    if (!res.success || !res.data) {
      toast.error(res.success ? t('admin.diagnosticAssessment.save.failed') : res.error.message);
      return;
    }
    toast.success(t('admin.diagnosticAssessment.save.success'));
    setCompletion(res.data.completion);
    const nextBaselines = new Map(baselines);
    const nextDrafts = new Map(drafts);
    for (const line of res.data.lines) {
      const draft = defaultDraftFromLine(line);
      nextBaselines.set(line.id, draft);
      nextDrafts.set(line.id, { ...draft });
    }
    setBaselines(nextBaselines);
    setDrafts(nextDrafts);
    await state.reload?.();
  }

  async function runLifecycle(
    action: 'confirm' | 'reset_to_draft' | 'build_roster' | 'sync_roster',
  ) {
    setActing(true);
    let ok = false;
    if (action === 'confirm') {
      const res = await confirmDiagnosticAssessment({ role, id: assessmentId });
      ok = res.success;
      if (!res.success) toast.error(res.error.message);
      else toast.success(t('admin.diagnosticAssessment.actions.confirmSuccess'));
    } else if (action === 'reset_to_draft') {
      const res = await resetAdminDiagnosticAssessment(assessmentId);
      ok = res.success;
      if (!res.success) toast.error(res.error.message);
      else toast.success(t('admin.diagnosticAssessment.actions.resetSuccess'));
    } else {
      const res = await postAdminDiagnosticRoster(assessmentId, action);
      ok = res.success;
      if (!res.success) toast.error(res.error.message);
      else {
        toast.success(t(`admin.diagnosticAssessment.actions.${action}Success`));
        if (res.data?.completion) setCompletion(res.data.completion);
      }
    }
    setActing(false);
    if (ok) await state.reload?.();
  }

  if (state.loading && !detail) {
    return <LoadingState label={t('common.loading')} />;
  }

  return (
    <div className="admin-workspace diagnostic-workspace">
      <PageHeader
        title={detail?.name || detail?.display_name || t('admin.diagnosticAssessment.detailTitle')}
        subtitle={t('admin.diagnosticAssessment.detailSubtitle')}
        actions={
          <div className="diagnostic-actions-bar">
            <Link href={listHref} className="btn btn--ghost btn--sm">
              {t('common.back')}
            </Link>
            <Link href={printHref} className="btn btn--ghost btn--sm">
              {t('admin.diagnosticAssessment.print.open')}
            </Link>
          </div>
        }
      />

      <ResourceView state={state}>
        {() => {
          if (!detail) {
            return (
              <EmptyState
                icon="📝"
                title={t('admin.diagnosticAssessment.detail.notFound.title')}
                description={t('admin.diagnosticAssessment.detail.notFound.description')}
              />
            );
          }

          return (
            <>
              <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                <div className="diagnostic-header__meta">
                  <div>
                    <span className="diagnostic-header__label">{t('nav.classes')}</span>
                    {detail.class?.name ?? t('common.dash')}
                  </div>
                  <div>
                    <span className="diagnostic-header__label">{t('nav.subjects')}</span>
                    {detail.subject?.name ?? t('common.dash')}
                  </div>
                  <div>
                    <span className="diagnostic-header__label">{t('nav.teachers')}</span>
                    {detail.teacher?.name ?? t('common.dash')}
                  </div>
                  <div>
                    <span className="diagnostic-header__label">{t('admin.diagnosticAssessment.assessmentDate')}</span>
                    {detail.assessment_date ?? t('common.dash')}
                  </div>
                  <div>
                    <span className="diagnostic-header__label">{t('admin.diagnosticAssessment.state')}</span>
                    <WorkflowBadge state={detail.state} />
                  </div>
                </div>
                <DiagnosticCompletionPanel completion={completion ?? detail.completion} />
              </div>

              <div className="diagnostic-actions-bar no-print">
                {allowedActions.build_roster ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={acting || dirtyCount > 0}
                    onClick={() => runLifecycle('build_roster')}
                  >
                    {t('admin.diagnosticAssessment.actions.buildRoster')}
                  </button>
                ) : null}
                {allowedActions.sync_roster ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={acting || dirtyCount > 0}
                    onClick={() => runLifecycle('sync_roster')}
                  >
                    {t('admin.diagnosticAssessment.actions.syncRoster')}
                  </button>
                ) : null}
                {allowedActions.confirm ? (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={acting || dirtyCount > 0}
                    onClick={() => runLifecycle('confirm')}
                  >
                    {t('admin.diagnosticAssessment.actions.confirm')}
                  </button>
                ) : null}
                {!isTeacher && allowedActions.reset_to_draft ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    disabled={acting || dirtyCount > 0}
                    onClick={() => runLifecycle('reset_to_draft')}
                  >
                    {t('admin.diagnosticAssessment.actions.resetToDraft')}
                  </button>
                ) : null}
              </div>

              {dirtyCount > 0 ? (
                <div className="diagnostic-save-bar no-print">
                  <span>
                    {t('admin.diagnosticAssessment.save.dirtyCount', { count: dirtyCount })}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={discardChanges}>
                      {t('admin.diagnosticAssessment.save.discard')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={saving}
                      onClick={saveChanges}
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                  </div>
                </div>
              ) : null}

              {!detail.lines.length ? (
                <EmptyState
                  icon="👥"
                  title={t('admin.diagnosticAssessment.detail.noRoster.title')}
                  description={t('admin.diagnosticAssessment.detail.noRoster.description')}
                />
              ) : (
                <DiagnosticEntryGrid
                  lines={detail.lines}
                  drafts={drafts}
                  scoreScale={detail.score_scale}
                  editable={canEdit}
                  onChange={handleDraftChange}
                />
              )}
            </>
          );
        }}
      </ResourceView>
    </div>
  );
}
