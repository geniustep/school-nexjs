'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  AdmissionGuardiansSection,
  hydrateAdmissionGuardians,
  type GuardianDraft,
} from '@/features/admin/admissions/guardians';
import { familyBatchGuardiansHaveChanges } from '@/features/admin/admissions/guardians/canonicalize-family-guardians-for-comparison';
import { patchFamilyBatchGuardians } from '../api/family-admissions-api';
import { useAdmissionOptions } from '../hooks/use-admission-options';
import {
  buildFamilyBatchChildKeyMaps,
  buildPatchFamilyBatchGuardiansPayload,
  validateFamilyBatchGuardiansPatchDraft,
} from '@/features/admin/admissions/guardians/serialize-family-batch-guardians-patch';
import { familyBatchGuardiansApiErrorMessage } from '../utils/family-batch-guardians-edit';
import type { FamilyBatchDetail } from '@/types/admission';

function cloneGuardianDrafts(drafts: GuardianDraft[]): GuardianDraft[] {
  return drafts.map((g) => ({
    ...g,
    linkedChildClientKeys: [...g.linkedChildClientKeys],
    identityDocument: { ...g.identityDocument },
  }));
}

export function FamilyBatchGuardiansEditDialog({
  open,
  batch,
  onClose,
  onSaved,
}: {
  open: boolean;
  batch: FamilyBatchDetail;
  onClose: () => void;
  onSaved: (next: FamilyBatchDetail) => void;
}) {
  const t = useT();
  const toast = useToast();
  const titleId = useId();
  const { activeSchoolId } = useAdminSession();
  const admissionOptionsState = useAdmissionOptions();
  const [guardians, setGuardians] = useState<GuardianDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Fixed baseline for the open session — not rebuilt on every render/prop churn. */
  const baselineRef = useRef<GuardianDraft[] | null>(null);
  const openSessionBatchIdRef = useRef<number | null>(null);

  const maps = useMemo(
    () => buildFamilyBatchChildKeyMaps(batch.applications ?? []),
    [batch.applications],
  );

  useEffect(() => {
    if (!open) {
      baselineRef.current = null;
      openSessionBatchIdRef.current = null;
      return;
    }

    // One snapshot per open session — do not rebuild baseline on prop/render churn.
    if (openSessionBatchIdRef.current === batch.batch_id && baselineRef.current) {
      return;
    }

    const drafts = hydrateAdmissionGuardians({
      guardians: batch.guardians,
      sharedContact:
        Array.isArray(batch.guardians) && batch.guardians.length > 0
          ? undefined
          : batch.shared_contact,
      childIdToClientKey: maps.childIdToClientKey,
    });
    baselineRef.current = cloneGuardianDrafts(drafts);
    openSessionBatchIdRef.current = batch.batch_id;
    setGuardians(cloneGuardianDrafts(drafts));
    setError(null);
    setSubmitting(false);
    // Intentional: read latest batch.guardians/shared_contact only when opening or changing batch_id.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable dirty baseline
  }, [open, batch.batch_id, maps.childIdToClientKey]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const relationshipLoadFailed =
    !admissionOptionsState.loading &&
    (admissionOptionsState.error != null ||
      (admissionOptionsState.options != null &&
        admissionOptionsState.options.relationships.length === 0));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null || submitting) return;

    const baseline = baselineRef.current ?? [];
    if (!familyBatchGuardiansHaveChanges(baseline, guardians, maps.childClientKeyToId)) {
      setError(t('admin.admissions.family.guardiansEdit.noChanges'));
      return;
    }

    const validation = validateFamilyBatchGuardiansPatchDraft(guardians, {
      childClientKeys: maps.childClientKeys,
      childClientKeyToId: maps.childClientKeyToId,
      batchChildIds: (batch.applications ?? []).map((a) => a.id),
    });
    if (validation) {
      setError(t(validation.messageKey));
      return;
    }

    const payload = buildPatchFamilyBatchGuardiansPayload(
      guardians,
      maps.childClientKeyToId,
    );

    setSubmitting(true);
    setError(null);
    const res = await patchFamilyBatchGuardians(batch.batch_id, payload, {
      active_school_id: activeSchoolId,
    });
    setSubmitting(false);

    if (!res.success) {
      setError(familyBatchGuardiansApiErrorMessage(res.error, t));
      return;
    }
    if (!res.data) {
      setError(t('errors.serverError'));
      return;
    }

    // Refresh baseline only after successful PATCH (dialog usually closes via onSaved).
    baselineRef.current = cloneGuardianDrafts(guardians);
    toast.success(t('admin.admissions.family.guardiansEdit.saveSuccess'));
    onSaved(res.data);
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => !submitting && onClose()}>
      <div
        className="card modal-panel family-batch-guardians-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="family-batch-guardians-edit-dialog__header">
          <h2 id={titleId}>{t('admin.admissions.family.guardiansEdit.title')}</h2>
          <p className="muted">{t('admin.admissions.family.guardiansEdit.lead')}</p>
        </header>

        <form className="family-batch-guardians-edit-dialog__form" onSubmit={handleSubmit}>
          <AdmissionGuardiansSection
            mode="family"
            guardians={guardians}
            onChange={setGuardians}
            relationships={admissionOptionsState.options?.relationships ?? []}
            relationshipsLoading={admissionOptionsState.loading}
            relationshipLoadFailed={relationshipLoadFailed}
            childrenOptions={maps.childrenOptions}
            warnings={batch.warning_details ?? null}
          />

          {error ? (
            <p className="alert alert--error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="family-batch-guardians-edit-dialog__actions">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={submitting}
              onClick={onClose}
            >
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting
                ? t('common.saving')
                : t('admin.admissions.family.guardiansEdit.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
