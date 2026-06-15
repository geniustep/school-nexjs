'use client';

import { useEffect, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import {
  canDeleteGuardianProfile,
  canDeleteOrphanPerson,
} from '../utils/guardian-profile-contract';
import {
  deleteBlockerMessage,
  deleteImpactSummaryLines,
  normalizeDeleteImpactFromRaw,
} from '../utils/guardian-delete-impact';
import { deleteGuardianProfile, fetchGuardianDeleteImpact } from '../utils/guardian-profile-api';
import type { GuardianAllowedActions, GuardianDeleteImpact } from '@/types/student-360';

export function GuardianDeleteDialog({
  open,
  parentId,
  parentName,
  allowedActions,
  initialImpact,
  onClose,
  onDeleted,
}: {
  open: boolean;
  parentId: number;
  parentName: string;
  allowedActions?: GuardianAllowedActions | null;
  initialImpact?: GuardianDeleteImpact | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const [impact, setImpact] = useState<GuardianDeleteImpact | null>(initialImpact ?? null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletePerson, setDeletePerson] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const canDeleteProfile = canDeleteGuardianProfile(allowedActions, user);
  const canDeletePerson = canDeleteOrphanPerson(allowedActions, user);
  const impactLines = deleteImpactSummaryLines(impact, t);
  const blockers = impact?.blockers ?? [];
  const requiresTypedConfirm = deletePerson && canDeletePerson;

  useEffect(() => {
    if (!open) {
      setImpact(initialImpact ?? null);
      setDeletePerson(false);
      setConfirmText('');
      return;
    }
    if (initialImpact) {
      setImpact(initialImpact);
      return;
    }
    let cancelled = false;
    setLoadingImpact(true);
    fetchGuardianDeleteImpact(parentId)
      .then((next) => {
        if (!cancelled) setImpact(next);
      })
      .finally(() => {
        if (!cancelled) setLoadingImpact(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, parentId, initialImpact]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canDeleteProfile || saving) return;
    if (requiresTypedConfirm) {
      const expected = t('admin.guardianProfile.deleteConfirmWord');
      if (confirmText.trim() !== expected && confirmText.trim() !== parentName.trim()) return;
    }
    setSaving(true);
    const res = await deleteGuardianProfile(parentId, {
      confirm: true,
      delete_orphan_person: deletePerson && canDeletePerson,
    });
    setSaving(false);
    if (res.success) {
      toast.success(t('admin.guardianProfile.deleteSuccess'));
      onClose();
      onDeleted();
      return;
    }
    toast.error(res.error.message);
  }

  if (!open) return null;

  const deleteDisabled =
    !canDeleteProfile ||
    saving ||
    loadingImpact ||
    (requiresTypedConfirm &&
      confirmText.trim() !== t('admin.guardianProfile.deleteConfirmWord') &&
      confirmText.trim() !== parentName.trim());

  return (
    <SetupDrawer open={open} title={t('admin.guardianProfile.deleteGuardianProfileTitle')} onClose={onClose}>
      <form className="guardian-flow-drawer__body guardian-flow-drawer__form" onSubmit={submit}>
        <p className="tiny muted">{t('admin.guardianProfile.deleteGuardianProfileIntro')}</p>
        <div className="guardian-selected-summary">
          <strong dir="auto">{parentName}</strong>
        </div>

        {loadingImpact ? <p className="tiny muted">{t('admin.guardianProfile.deleteImpactLoading')}</p> : null}

        {impactLines.length ? (
          <div className="guardian-delete-dialog__impact">
            <p className="guardian-delete-dialog__impact-title">{t('admin.guardianProfile.deleteImpactTitle')}</p>
            <ul className="guardian-delete-dialog__impact-list">
              {impactLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {blockers.map((blocker) => (
          <div key={blocker.code} className="guardian-delete-dialog__blocker" role="alert">
            <p>{deleteBlockerMessage(t, blocker)}</p>
          </div>
        ))}

        {!canDeleteProfile ? (
          <div className="guardian-delete-dialog__blocker" role="alert">
            <p>{t('admin.guardianProfile.deleteNotAllowed')}</p>
          </div>
        ) : (
          <>
            <p className="tiny muted">
              {deletePerson && canDeletePerson
                ? t('admin.guardianProfile.deleteProfileAndPersonHint')
                : t('admin.guardianProfile.deleteProfileOnlyHint')}
            </p>
            {canDeletePerson ? (
              <label className="guardian-delete-dialog__confirm-check">
                <input
                  type="checkbox"
                  checked={deletePerson}
                  onChange={(e) => setDeletePerson(e.target.checked)}
                />
                <span>{t('admin.guardianProfile.deleteProfileAndPerson')}</span>
              </label>
            ) : null}
            {requiresTypedConfirm ? (
              <label className="col" style={{ gap: 4 }}>
                <span className="tiny muted">{t('admin.guardianProfile.deleteTypedConfirmHint')}</span>
                <input
                  className="input"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={t('admin.guardianProfile.deleteConfirmWord')}
                />
              </label>
            ) : null}
          </>
        )}

        <div className="guardian-flow-drawer__actions">
          {canDeleteProfile ? (
            <button type="submit" className="btn btn--danger btn--sm" disabled={deleteDisabled}>
              {saving ? t('admin.guardianProfile.deletingProfile') : t('admin.guardianProfile.deleteGuardianProfileAction')}
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}

export { normalizeDeleteImpactFromRaw };
