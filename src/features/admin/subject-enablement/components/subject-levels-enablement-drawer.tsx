'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useT } from '@/features/i18n/locale-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { Level, Subject } from '@/types/class';
import { isSubjectLevelEnablementWriteAvailable } from '@/types/subject-enablement';
import {
  fetchSubjectEnablement,
  updateSubjectEnablement,
} from '../api/enablement-api';
import { useEnablementMatrix } from '../hooks/use-enablement-matrix';
import { useLevelDraft } from '../hooks/use-enablement-draft';
import { EnablementChangeSummaryPanel } from './enablement-change-summary';
import { confirmDiscardEnablementDraft } from './level-enablement-matrix-panel';
import { mapEnablementApiError } from '../utils/map-enablement-errors';

export function SubjectLevelsEnablementDrawer({
  open,
  subject,
  levels,
  onClose,
  onSaved,
}: {
  open: boolean;
  subject: Subject | null;
  levels: Level[];
  onClose: () => void;
  onSaved?: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const writeGate = isSubjectLevelEnablementWriteAvailable();

  const enablement = useEnablementMatrix({
    subjectId: open && subject != null && writeGate ? subject.id : null,
    active: open && subject != null && writeGate,
  });

  const serverEnabled = useMemo(() => {
    const set = new Set<number>();
    if (enablement.payload) {
      for (const item of enablement.payload.items) {
        if (
          item.operational_subject_id === subject?.id &&
          item.enabled &&
          item.is_active !== false
        ) {
          set.add(item.level.id);
        }
      }
      return set;
    }
    // Legacy hint from subject.level_ids when write gate off
    const raw = Array.isArray(subject?.level_ids)
      ? subject!.level_ids!
      : subject?.level_id != null
        ? [subject.level_id]
        : [];
    for (const id of raw) {
      if (typeof id === 'number' && id > 0) set.add(id);
    }
    return set;
  }, [enablement.payload, subject]);

  const levelIds = useMemo(() => levels.map((l) => l.id), [levels]);
  const resetKey = `${subject?.id ?? ''}:${enablement.payload?.version ?? ''}:${[...serverEnabled].sort().join(',')}`;
  const draft = useLevelDraft(levelIds, serverEnabled, resetKey);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [consumerDetails, setConsumerDetails] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      setSaveError(null);
      setConsumerDetails(null);
    }
  }, [open]);

  const canManage = Boolean(
    writeGate && enablement.payload?.permissions?.can_manage === true,
  );
  const canViewOnly = Boolean(
    writeGate &&
      enablement.payload?.permissions?.can_view === true &&
      !enablement.payload?.permissions?.can_manage,
  );

  const levelById = useMemo(() => new Map(levels.map((l) => [l.id, l])), [levels]);

  const requestClose = useCallback(() => {
    if (!confirmDiscardEnablementDraft(draft.dirty, t)) return;
    onClose();
  }, [draft.dirty, onClose, t]);

  const handleSave = useCallback(async () => {
    if (!subject || !canManage || !enablement.payload) return;
    const yearId = enablement.payload.academic_year.id;
    const { enableIds, disableIds } = draft.summary;
    if (!enableIds.length && !disableIds.length) return;

    setSaving(true);
    setSaveError(null);
    setConsumerDetails(null);

    // Contract POST is level-scoped — one call per dirty level, same API as settings page.
    const dirtyLevels = [
      ...enableIds.map((levelId) => ({ levelId, enable: true as const })),
      ...disableIds.map((levelId) => ({ levelId, enable: false as const })),
    ];

    for (const step of dirtyLevels) {
      const slice = await fetchSubjectEnablement(
        { level_id: step.levelId, academic_year_id: yearId },
        activeSchoolId,
      );
      if (!slice.ok) {
        const mapped = mapEnablementApiError(slice.error, t);
        setSaveError(mapped.message);
        setSaving(false);
        setConfirmOpen(false);
        return;
      }

      const result = await updateSubjectEnablement(
        {
          academic_year_id: yearId,
          level_id: step.levelId,
          enable_subject_ids: step.enable ? [subject.id] : [],
          disable_subject_ids: step.enable ? [] : [subject.id],
          expected_version: slice.data.version,
        },
        activeSchoolId,
      );

      if (!result.ok) {
        const mapped = mapEnablementApiError(result.error, t);
        setSaveError(mapped.message);
        if (mapped.isSafetyBlock && mapped.consumerSummary) {
          const parts = Object.entries(mapped.consumerSummary.active_consumer_counts)
            .filter(([, n]) => typeof n === 'number' && n > 0)
            .map(([key, n]) => `${key}: ${n}`);
          setConsumerDetails(parts.join(' · ') || null);
        }
        setSaving(false);
        setConfirmOpen(false);
        enablement.reload();
        return;
      }
    }

    setSaving(false);
    setConfirmOpen(false);
    enablement.reload();
    onSaved?.();
  }, [
    subject,
    canManage,
    enablement,
    draft.summary,
    activeSchoolId,
    t,
    onSaved,
  ]);

  const title = subject
    ? t('admin.subjectEnablement.manageSubjectLevelsTitle', {
        subject: subject.code ? `${subject.name} (${subject.code})` : subject.name,
      })
    : t('admin.subjectEnablement.manageSubjectLevelsFallback');

  const loading = writeGate ? enablement.loading : false;
  const error = writeGate ? enablement.error : null;

  return (
    <SetupDrawer open={open && subject != null} title={title} onClose={requestClose}>
      {!writeGate || canViewOnly ? (
        <div className="academic-setup-gap-banner" role="status">
          <p>
            <strong>
              {canViewOnly
                ? t('admin.subjectEnablement.viewOnlyTitle')
                : t('admin.subjectEnablement.readOnlyTitle')}
            </strong>
          </p>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            {canViewOnly
              ? t('admin.subjectEnablement.viewOnlyHint')
              : t('admin.subjectEnablement.readOnlyHint')}
          </p>
        </div>
      ) : null}

      {subject ? (
        <p className="tiny muted mono" dir="ltr" style={{ marginTop: 8 }}>
          {subject.code || '—'}
        </p>
      ) : null}

      {loading ? <span className="tiny muted">{t('common.loading')}</span> : null}

      {error ? (
        <div className="col" style={{ gap: 8 }} role="alert">
          <span>{t('admin.subjectEnablement.loadError')}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={enablement.reload}>
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      <p className="tiny muted" style={{ marginTop: 8 }}>
        {t('admin.subjectEnablement.enabledLevelsCount', {
          count: serverEnabled.size,
        })}
      </p>

      {saveError ? (
        <div className="academic-setup-gap-banner" role="alert">
          <p>{saveError}</p>
          {consumerDetails ? (
            <p className="tiny muted" style={{ marginTop: 4 }} dir="ltr">
              {consumerDetails}
            </p>
          ) : null}
        </div>
      ) : null}

      {confirmOpen && canManage ? (
        <EnablementChangeSummaryPanel
          summary={draft.summary}
          resolveLabel={(id) => {
            const level = levelById.get(id);
            return {
              id,
              name: level?.name ?? String(id),
              code: level?.code ?? '',
            };
          }}
        />
      ) : null}

      <div className="col" style={{ gap: 6, marginTop: 12, maxHeight: 360, overflow: 'auto' }}>
        {levels.map((level) => {
          const enabled = draft.isDraftEnabled(level.id);
          return (
            <div
              key={level.id}
              className="row"
              style={{ gap: 10, justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span className="col" style={{ gap: 2 }}>
                <span dir="auto">{level.name}</span>
                {level.code ? (
                  <span className="tiny muted mono" dir="ltr">
                    {level.code}
                  </span>
                ) : null}
              </span>
              {canManage ? (
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={saving}
                  aria-label={`${level.name} ${level.code ?? ''}`}
                  data-testid={`subject-level-toggle-${level.id}`}
                  onChange={(e) => {
                    draft.toggle(level.id, e.target.checked);
                    setConfirmOpen(false);
                    setSaveError(null);
                  }}
                />
              ) : (
                <span className="tiny">
                  {enabled
                    ? t('admin.subjectEnablement.statusEnabled')
                    : t('admin.subjectEnablement.statusNotEnabled')}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {canManage && draft.dirty ? (
        <div className="row" style={{ gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {!confirmOpen ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="subject-enablement-review-save"
              onClick={() => setConfirmOpen(true)}
            >
              {t('admin.subjectEnablement.reviewChanges')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="subject-enablement-confirm-save"
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

      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        <button type="button" className="btn btn--ghost" onClick={requestClose}>
          {t('common.close')}
        </button>
      </div>
    </SetupDrawer>
  );
}
