/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse } from '@/types/api';
import type { GradebookDetail, GradebookLifecycleAction } from '@/types/gradebook';
import {
  patchAdminGradebookEntries,
  patchTeacherGradebookEntries,
  postAdminGradebookLifecycle,
  submitTeacherGradebook,
} from '../api/gradebooks-api';
import { GradebookCompositeGrid } from './gradebook-composite-grid';
import { GradebookDetailHeader } from './gradebook-detail-header';
import { GradebookLifecycleActions } from './gradebook-lifecycle-actions';
import { GradebookResultsView } from './gradebook-results-view';
import { GradebookSimpleGrid } from './gradebook-simple-grid';
import {
  applySavedEntries,
  buildBaselineMap,
  buildBatchPayload,
  cellDraftKey,
  countDirtyCells,
  defaultDraftForEntry,
  findMatrixEntry,
  type CellDraftKey,
  type CellDraftValue,
} from '../utils/gradebook-entry-draft';
import { GRADEBOOK_LIST_STATES, formatCompletionSummary } from '../utils/gradebook-list-present';
import {
  TEACHER_GRADEBOOK_LIFECYCLE_ACTIONS,
  canEditGradebookEntries,
  normalizeGradebookAllowedActions,
} from '../utils/gradebook-allowed-actions';
import { normalizeGradebookDetailPayload } from '../utils/gradebook-normalize';
import '../gradebook-workspace.css';

export type GradebookWorkspaceRole = 'admin' | 'teacher';

function resolveDetailEmptyVariant(detail: GradebookDetail | null): 'loading' | 'no-roster' | 'not-open' | 'ready' | 'error' {
  if (!detail) return 'loading';
  if (!detail.roster?.length) return 'no-roster';
  if (detail.context.state === 'draft') return 'not-open';
  return 'ready';
}

export function GradebookDetailWorkspace({
  gradebookId,
  role = 'admin',
}: {
  gradebookId: string;
  role?: GradebookWorkspaceRole;
}) {
  const t = useT();
  const toast = useToast();
  const isTeacher = role === 'teacher';
  const listHref = isTeacher
    ? '/teacher/assessment/gradebooks'
    : '/admin/academics/assessment/gradebooks';
  const detailPath = isTeacher
    ? endpoints.teacher.gradebook(gradebookId)
    : endpoints.admin.gradebook(gradebookId);

  const adminState = useAdminResource<GradebookDetail>(isTeacher ? null : detailPath);
  const teacherState = useResource<GradebookDetail>(isTeacher ? detailPath : null);
  const state = isTeacher ? teacherState : adminState;

  const detail = useMemo(
    () => (state.data ? normalizeGradebookDetailPayload(state.data) : null),
    [state.data],
  );
  const [baseline, setBaseline] = useState(() => buildBaselineMap(detail?.matrix ?? []));
  const [drafts, setDrafts] = useState(() => new Map<CellDraftKey, CellDraftValue>());
  const [saving, setSaving] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<'entries' | 'results'>('entries');
  const [completion, setCompletion] = useState(detail?.completion);
  const [allowedActions, setAllowedActions] = useState(() =>
    normalizeGradebookAllowedActions(detail?.allowed_actions),
  );

  useEffect(() => {
    if (!detail) return;
    const nextBaseline = buildBaselineMap(detail.matrix);
    const nextDrafts = new Map<CellDraftKey, CellDraftValue>();
    for (const entry of detail.matrix) {
      const key = cellDraftKey(entry.student_line_id, entry.cell_id);
      nextDrafts.set(key, defaultDraftForEntry(entry));
    }
    setBaseline(nextBaseline);
    setDrafts(nextDrafts);
    setCompletion(detail.completion);
    setAllowedActions(normalizeGradebookAllowedActions(detail.allowed_actions));
  }, [detail]);

  const dirtyCount = useMemo(() => countDirtyCells(baseline, drafts), [baseline, drafts]);
  const emptyVariant = resolveDetailEmptyVariant(detail);
  const canEdit = canEditGradebookEntries(role, allowedActions);

  const getCellState = useCallback(
    (studentLineId: number, cellId: number) => {
      const key = cellDraftKey(studentLineId, cellId);
      const draft = drafts.get(key);
      const base = baseline.get(key);
      if (draft && base) {
        return { draft, editable: canEdit && base.editable };
      }
      const entry = findMatrixEntry(detail?.matrix ?? [], studentLineId, cellId);
      return {
        draft: entry ? defaultDraftForEntry(entry) : {
          score: null,
          score_is_set: false,
          participation_state: 'not_entered' as const,
        },
        editable: canEdit && (entry?.editable ?? false),
      };
    },
    [baseline, canEdit, detail?.matrix, drafts],
  );

  function handleDraftChange(studentLineId: number, cellId: number, value: CellDraftValue) {
    if (!canEdit) return;
    const key = cellDraftKey(studentLineId, cellId);
    setDrafts((current) => {
      const next = new Map(current);
      next.set(key, value);
      return next;
    });
  }

  function discardChanges() {
    if (!detail) return;
    const nextDrafts = new Map<CellDraftKey, CellDraftValue>();
    for (const entry of detail.matrix) {
      nextDrafts.set(cellDraftKey(entry.student_line_id, entry.cell_id), defaultDraftForEntry(entry));
    }
    setDrafts(nextDrafts);
  }

  async function saveChanges() {
    if (!detail || dirtyCount === 0 || !canEdit) return;
    const payload = buildBatchPayload(baseline, drafts);
    if (!payload.length) return;
    setSaving(true);
    const res = isTeacher
      ? await patchTeacherGradebookEntries(detail.id, { entries: payload })
      : await patchAdminGradebookEntries(detail.id, { entries: payload });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error.message || t('admin.gradebooks.saveFailed'));
      return;
    }
    if (res.data?.completion) setCompletion(res.data.completion);
    if (res.data?.entries?.length) {
      const applied = applySavedEntries(baseline, drafts, res.data.entries);
      setBaseline(applied.baseline);
      setDrafts(applied.drafts);
    } else {
      state.reload();
    }
    toast.success(t('admin.gradebooks.saveSuccess', { count: payload.length }));
  }

  function applyLifecycleDetail(next?: GradebookDetail) {
    if (next) {
      setAllowedActions(normalizeGradebookAllowedActions(next.allowed_actions));
      if (next.completion) setCompletion(next.completion);
    }
    state.reload();
  }

  async function runTeacherLifecycle(
    id: number,
    action: GradebookLifecycleAction,
  ): Promise<ApiResponse<GradebookDetail>> {
    if (action === 'submit') return submitTeacherGradebook(id);
    return {
      success: false,
      error: { message: t('admin.gradebooks.actionFailed'), code: 'forbidden' },
      meta: {},
    };
  }

  const lifecycleSteps = GRADEBOOK_LIST_STATES;
  const currentState = detail?.context.state;
  const currentIndex = lifecycleSteps.indexOf(
    currentState as (typeof GRADEBOOK_LIST_STATES)[number],
  );

  const titleKey = isTeacher ? 'teacher.gradebooks.detailTitle' : 'admin.gradebooks.detailTitle';
  const noRosterDescKey = isTeacher
    ? 'teacher.gradebooks.empty.noRoster.description'
    : 'admin.gradebooks.empty.noRoster.description';
  const notOpenDescKey = isTeacher
    ? 'teacher.gradebooks.empty.notOpen.description'
    : 'admin.gradebooks.empty.notOpen.description';

  return (
    <div className="admin-workspace gradebook-workspace">
      <PageHeader
        title={t(titleKey)}
        subtitle={detail?.context.subject?.name ?? undefined}
        actions={
          <Link href={listHref} className="btn btn--ghost btn--sm">
            {t('admin.gradebooks.backToList')}
          </Link>
        }
      />

      <ResourceView state={state}>
        {() =>
          detail ? (
          <>
            <GradebookDetailHeader
              context={detail.context}
              completion={completion ?? detail.completion}
            />

            {currentState ? (
              <div className="gradebook-lifecycle-bar" aria-label={t('admin.gradebooks.lifecycle.label')}>
                {lifecycleSteps.map((step, index) => {
                  const active = step === currentState;
                  const reached = currentIndex >= 0 && lifecycleSteps.indexOf(step) <= currentIndex;
                  return (
                    <span
                      key={step}
                      className={`gradebook-lifecycle-bar__step${active ? ' is-current' : ''}${reached ? ' is-reached' : ''}`}
                    >
                      {t(`states.${step}`)}
                      {index < lifecycleSteps.length - 1 ? (
                        <span className="gradebook-lifecycle-bar__sep" aria-hidden="true">
                          →
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            ) : null}

            <GradebookLifecycleActions
              gradebookId={detail.id}
              allowedActions={allowedActions}
              actionCatalog={
                isTeacher ? TEACHER_GRADEBOOK_LIFECYCLE_ACTIONS : undefined
              }
              runLifecycle={
                isTeacher
                  ? runTeacherLifecycle
                  : (id, action) => postAdminGradebookLifecycle(id, action)
              }
              onSuccess={applyLifecycleDetail}
            />

            <div
              className="gradebook-view-toggle"
              role="tablist"
              aria-label={t('admin.gradebooks.viewToggle.label')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={workspaceView === 'entries'}
                className={`gradebook-view-toggle__item${workspaceView === 'entries' ? ' is-active' : ''}`}
                onClick={() => setWorkspaceView('entries')}
              >
                {t('admin.gradebooks.viewToggle.entries')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={workspaceView === 'results'}
                className={`gradebook-view-toggle__item${workspaceView === 'results' ? ' is-active' : ''}`}
                onClick={() => setWorkspaceView('results')}
                data-testid="gradebook-results-tab"
              >
                {t('admin.gradebooks.viewToggle.results')}
              </button>
            </div>

            {workspaceView === 'results' ? (
              <GradebookResultsView
                gradebookId={detail.id}
                role={role}
                roster={detail.roster}
                structure={detail.structure}
              />
            ) : (
              <>
            <div className="gradebook-save-bar toolbar">
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={!canEdit || dirtyCount === 0 || saving}
                onClick={() => void saveChanges()}
              >
                {saving ? t('common.saving') : t('admin.gradebooks.save', { count: dirtyCount })}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={!canEdit || dirtyCount === 0 || saving}
                onClick={discardChanges}
              >
                {t('admin.gradebooks.discard')}
              </button>
              <span className="muted tiny">
                {formatCompletionSummary(
                  (completion ?? detail.completion).completion_percent,
                  (completion ?? detail.completion).unresolved_entries,
                  t,
                )}
              </span>
            </div>

            <p className="gradebook-narrow-hint muted">
              {t('admin.gradebooks.narrowHint')}
            </p>

            {emptyVariant === 'no-roster' ? (
              <EmptyState
                icon="👥"
                title={t('admin.gradebooks.empty.noRoster.title')}
                description={t(noRosterDescKey)}
              />
            ) : null}

            {emptyVariant === 'not-open' ? (
              <EmptyState
                icon="📒"
                title={t('admin.gradebooks.empty.notOpen.title')}
                description={t(notOpenDescKey)}
              />
            ) : null}

            {emptyVariant === 'ready' ? (
              detail.structure.mode === 'composite' ? (
                <GradebookCompositeGrid
                  structure={detail.structure}
                  roster={detail.roster}
                  getCellState={getCellState}
                  onDraftChange={handleDraftChange}
                />
              ) : (
                <GradebookSimpleGrid
                  structure={detail.structure}
                  roster={detail.roster}
                  getCellState={getCellState}
                  onDraftChange={handleDraftChange}
                />
              )
            ) : null}
              </>
            )}
          </>
          ) : null
        }
      </ResourceView>

      {state.initialLoading ? <LoadingState label={t('common.loading')} /> : null}
    </div>
  );
}
