'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { SubjectLevelEnablementMatrix } from '@/types/subject-enablement';
import { updateSubjectEnablement } from '../api/enablement-api';
import { useEnablementDraft } from '../hooks/use-enablement-draft';
import { filterEnablementRows, formatSubjectLabel } from '../utils/build-enablement-matrix';
import { mapEnablementApiError } from '../utils/map-enablement-errors';
import { EnablementChangeSummaryPanel } from './enablement-change-summary';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function LevelEnablementMatrixPanel({
  matrix,
  loading,
  error,
  onRetry,
  onSaved,
  onDirtyChange,
  t: tProp,
}: {
  matrix: SubjectLevelEnablementMatrix | null;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onSaved?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  t?: Translate;
}) {
  const tHook = useT();
  const t = tProp ?? tHook;
  const { activeSchoolId } = useAdminSession();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [consumerDetails, setConsumerDetails] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resetKey = `${matrix?.levelId ?? ''}:${matrix?.version ?? ''}`;
  const draft = useEnablementDraft(matrix?.rows ?? [], resetKey);

  useEffect(() => {
    onDirtyChange?.(draft.dirty);
  }, [draft.dirty, onDirtyChange]);

  const rows = useMemo(
    () => (matrix ? filterEnablementRows(matrix.rows, search) : []),
    [matrix, search],
  );

  const canWrite = Boolean(matrix?.writeAvailable && matrix.permissions.canManage);
  const rowById = useMemo(() => {
    const map = new Map<number, { id: number; name: string; code: string }>();
    for (const row of matrix?.rows ?? []) {
      map.set(row.operationalSubjectId, {
        id: row.operationalSubjectId,
        name: row.name,
        code: row.code,
      });
    }
    return map;
  }, [matrix?.rows]);

  const handleSave = useCallback(async () => {
    if (!matrix || !canWrite || !matrix.academicYearId || !matrix.version) return;
    if (!draft.summary.dirty) return;
    setSaving(true);
    setSaveError(null);
    setConsumerDetails(null);
    const result = await updateSubjectEnablement(
      {
        academic_year_id: matrix.academicYearId,
        level_id: matrix.levelId,
        enable_subject_ids: draft.summary.enableIds,
        disable_subject_ids: draft.summary.disableIds,
        expected_version: matrix.version,
      },
      activeSchoolId,
    );
    setSaving(false);
    setConfirmOpen(false);

    if (!result.ok) {
      const mapped = mapEnablementApiError(result.error, t);
      setSaveError(mapped.message);
      if (mapped.isSafetyBlock && mapped.consumerSummary) {
        const parts = Object.entries(mapped.consumerSummary.active_consumer_counts)
          .filter(([, n]) => typeof n === 'number' && n > 0)
          .map(([key, n]) => `${key}: ${n}`);
        setConsumerDetails(parts.join(' · ') || null);
      }
      // Safety / version / server: keep draft; caller refreshes matrix for sync
      if (mapped.isVersionConflict || mapped.isSafetyBlock) {
        onRetry();
      }
      return;
    }

    draft.resetToServer();
    onRetry();
    onSaved?.();
  }, [matrix, canWrite, draft, activeSchoolId, t, onRetry, onSaved]);

  if (loading) {
    return (
      <div className="col" style={{ gap: 8 }} aria-busy="true">
        <div className="skeleton" style={{ height: 18, width: '60%' }} />
        <div className="skeleton" style={{ height: 18, width: '80%' }} />
        <div className="skeleton" style={{ height: 18, width: '70%' }} />
        <span className="tiny muted">{t('common.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col" style={{ gap: 8 }} role="alert">
        <span>{t('admin.subjectEnablement.loadError')}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!matrix) {
    return <span className="tiny muted">{t('admin.selectLevel')}</span>;
  }

  if (matrix.counts.operationalActive === 0) {
    return (
      <div className="academic-setup-gap-banner" role="status">
        <p>{t('admin.subjectEnablement.noOperationalSubjects')}</p>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 12 }}>
      {!canWrite && (
        <div className="academic-setup-gap-banner" role="status">
          <p>
            <strong>
              {matrix.permissions.canView && !matrix.permissions.canManage
                ? t('admin.subjectEnablement.viewOnlyTitle')
                : t('admin.subjectEnablement.readOnlyTitle')}
            </strong>
          </p>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            {matrix.permissions.canView && !matrix.permissions.canManage
              ? t('admin.subjectEnablement.viewOnlyHint')
              : t('admin.subjectEnablement.readOnlyHint')}
          </p>
        </div>
      )}

      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          style={{ minWidth: 220, flex: 1 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.subjectEnablement.searchPlaceholder')}
          aria-label={t('admin.subjectEnablement.searchPlaceholder')}
        />
        <span className="tiny muted">
          {t('admin.subjectEnablement.levelCounts', {
            enabled: matrix.counts.enabled,
            notEnabled: matrix.counts.notEnabled,
            operational: matrix.counts.operationalActive,
          })}
        </span>
      </div>

      {matrix.counts.enabled === 0 ? (
        <div className="academic-setup-gap-banner" role="status" data-testid="enablement-empty-level">
          <p>{t('admin.subjectEnablement.emptyEnabledState')}</p>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            {t('admin.subjectEnablement.emptyEnabledHint')}
          </p>
        </div>
      ) : null}

      {saveError ? (
        <div className="academic-setup-gap-banner" role="alert" data-testid="enablement-save-error">
          <p>{saveError}</p>
          {consumerDetails ? (
            <p className="tiny muted" style={{ marginTop: 4 }} dir="ltr">
              {consumerDetails}
            </p>
          ) : null}
        </div>
      ) : null}

      {confirmOpen && canWrite ? (
        <EnablementChangeSummaryPanel
          summary={draft.summary}
          resolveLabel={(id) => rowById.get(id) ?? { id, name: `#${id}`, code: '' }}
        />
      ) : null}

      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              {canWrite ? <th scope="col">{t('admin.subjectEnablement.colEnabled')}</th> : null}
              <th scope="col">{t('admin.subjectEnablement.colSubject')}</th>
              <th scope="col">{t('admin.subjectEnablement.colCode')}</th>
              <th scope="col">{t('admin.subjectEnablement.colStatus')}</th>
              {!canWrite ? <th scope="col">{t('admin.subjectEnablement.colSource')}</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const checked = draft.isDraftEnabled(row.operationalSubjectId);
              return (
                <tr key={row.operationalSubjectId}>
                  {canWrite ? (
                    <td>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving}
                        aria-label={formatSubjectLabel(row)}
                        data-testid={`enablement-toggle-${row.operationalSubjectId}`}
                        onChange={(e) => {
                          // Local draft only — never POST here
                          draft.toggle(row.operationalSubjectId, e.target.checked);
                          setConfirmOpen(false);
                          setSaveError(null);
                        }}
                      />
                    </td>
                  ) : null}
                  <td dir="auto">{row.name}</td>
                  <td>
                    <span className="tiny muted mono" dir="ltr">
                      {row.code || '—'}
                    </span>
                  </td>
                  <td>
                    {checked
                      ? t('admin.subjectEnablement.statusEnabled')
                      : t('admin.subjectEnablement.statusNotEnabled')}
                  </td>
                  {!canWrite ? (
                    <td className="tiny muted">
                      {row.source === 'track'
                        ? t('admin.subjectEnablement.sourceTrack')
                        : row.source === 'level'
                          ? t('admin.subjectEnablement.sourceLevel')
                          : t('common.dash')}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canWrite && draft.dirty ? (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {!confirmOpen ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="enablement-review-save"
              onClick={() => setConfirmOpen(true)}
            >
              {t('admin.subjectEnablement.reviewChanges')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="enablement-confirm-save"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? t('common.saving') : t('admin.subjectEnablement.confirmSave')}
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={saving}
            onClick={() => {
              draft.resetToServer();
              setConfirmOpen(false);
              setSaveError(null);
            }}
          >
            {t('admin.subjectEnablement.discardChanges')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Exposed for drawer close guards. */
export function confirmDiscardEnablementDraft(
  dirty: boolean,
  t: Translate,
): boolean {
  if (!dirty) return true;
  return window.confirm(t('admin.subjectEnablement.unsavedWarning'));
}
