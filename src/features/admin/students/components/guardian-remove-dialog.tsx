'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { mapGuardianRemovalBlocker, mapGuardianApiError } from '../utils/guardian-api-errors';
import {
  fetchGuardianRelationshipDetail,
  removeGuardianRelationship,
} from '../utils/guardian-remove-relationship';
import {
  canSubmitRemoval,
  impactSummaryDisplayLines,
  isRemovalBlocked,
} from '../utils/guardian-removal-shared';
import {
  formatRoleLabels,
  personHasTeacherRole,
} from '../utils/person-role-presentation';
import { relationshipTypeLabel } from '../utils/relationship-types';
import type {
  GuardianAllowedActions,
  GuardianRelationship,
  GuardianRemovalImpact,
} from '@/types/student-360';

export function GuardianRemoveDialog({
  open,
  studentId,
  relationship,
  onClose,
  onRemoved,
}: {
  open: boolean;
  studentId: number;
  relationship: GuardianRelationship | null;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [impact, setImpact] = useState<GuardianRemovalImpact | null>(null);
  const [allowedActions, setAllowedActions] = useState<GuardianAllowedActions | null>(null);
  const [liveRelationship, setLiveRelationship] = useState<GuardianRelationship | null>(null);
  const [confirmAcknowledged, setConfirmAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<ReturnType<typeof mapGuardianRemovalBlocker> | null>(null);

  const activeRelationship = liveRelationship ?? relationship;

  useEffect(() => {
    if (!open || !relationship) {
      setImpact(null);
      setAllowedActions(null);
      setLiveRelationship(null);
      setError(null);
      setBlocker(null);
      setNotes('');
      setConfirmAcknowledged(false);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    fetchGuardianRelationshipDetail(studentId, relationship.relationship_id)
      .then((detail) => {
        if (cancelled || !detail) return;
        setLiveRelationship(detail.relationship);
        setAllowedActions(detail.allowed_actions ?? detail.relationship.allowed_actions ?? null);
        setImpact(detail.removal_impact ?? detail.relationship.removal_impact ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, relationship, studentId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRelationship || saving) return;
    if (!canSubmitRemoval(impact, allowedActions)) return;
    if (impact?.requires_confirmation && !confirmAcknowledged) return;

    setSaving(true);
    setError(null);
    setBlocker(null);

    const payload = {
      confirm: impact?.requires_confirmation === true,
      notes: notes.trim() || undefined,
    };

    const res = await removeGuardianRelationship(
      studentId,
      activeRelationship.relationship_id,
      payload,
    );
    setSaving(false);

    if (res.success) {
      const multiRole =
        personHasTeacherRole(activeRelationship.guardian) ||
        (impact?.multi_role_person ?? false) ||
        (impact?.other_roles?.length ?? 0) > 0;
      toast.success(
        multiRole
          ? t('admin.student360.guardianRemovedMultiRoleSuccess')
          : t('admin.student360.guardianRemovedSuccess'),
      );
      onClose();
      onRemoved();
      return;
    }

    const removalBlocker = mapGuardianRemovalBlocker(res.error, t);
    if (removalBlocker) {
      setBlocker(removalBlocker);
      setError(removalBlocker.message);
      return;
    }

    const mapped = mapGuardianApiError(res.error, t);
    setError(mapped.message);
  }

  if (!open || !activeRelationship) return null;

  const impactLines = impactSummaryDisplayLines(impact, t);
  const blocked = isRemovalBlocked(impact, allowedActions);
  const removeDisabled =
    !canSubmitRemoval(impact, allowedActions) ||
    (impact?.requires_confirmation === true && !confirmAcknowledged);
  const hasProfessionalRole =
    personHasTeacherRole(activeRelationship.guardian) || impact?.multi_role_person === true;
  const roleLabels = formatRoleLabels(
    activeRelationship.guardian.role_labels ?? impact?.role_labels ?? impact?.other_roles,
  );

  return (
    <SetupDrawer open={open} title={t('admin.student360.removeGuardianFromStudent')} onClose={onClose}>
      <form className="guardian-remove-dialog" onSubmit={submit}>
        <div className="guardian-remove-dialog__intro">
          <p>{t('admin.student360.removeGuardianConfirmTitle')}</p>
          <p className="tiny muted">{t('admin.student360.removeGuardianConfirmBody')}</p>
          {hasProfessionalRole ? (
            <p className="tiny muted">{t('admin.student360.removeGuardianProfessionalSafe')}</p>
          ) : null}
        </div>

        <div className="guardian-selected-summary">
          <strong dir="auto">{activeRelationship.guardian.name}</strong>
          <p className="tiny">
            {t('admin.student360.relationshipTypeLabel')}:{' '}
            {relationshipTypeLabel(t, activeRelationship.relationship_type)}
          </p>
          {roleLabels ? (
            <p className="tiny muted">
              {t('admin.student360.currentRoles')}: {roleLabels}
            </p>
          ) : null}
          {hasProfessionalRole ? (
            <p className="tiny guardian-remove-dialog__professional-note">
              {t('admin.student360.removeGuardianTeacherNote', { name: activeRelationship.guardian.name })}
            </p>
          ) : null}
        </div>

        {loadingDetail ? (
          <p className="tiny muted">{t('admin.student360.removeGuardianImpactLoading')}</p>
        ) : null}

        {allowedActions?.remove_relationship === false ? (
          <div className="guardian-remove-dialog__blocker" role="alert">
            <p>{t('admin.student360.removeGuardianNotAllowed')}</p>
          </div>
        ) : null}

        {impactLines.length ? (
          <div className="guardian-remove-dialog__impact" role="status">
            <p className="guardian-remove-dialog__impact-title">{t('admin.student360.removeGuardianImpactTitle')}</p>
            <ul className="guardian-remove-dialog__impact-list">
              {impactLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {impact?.financial_blockers?.length ? (
          <div className="guardian-remove-dialog__blocker" role="alert">
            <p>{t('admin.student360.removeGuardianFinancialBlocker')}</p>
            <ul className="guardian-remove-dialog__impact-list">
              {impact.financial_blockers.map((item) => (
                <li key={`${item.code}-${item.agreement_id ?? item.profile_id ?? item.message}`}>{item.message}</li>
              ))}
            </ul>
            <div className="guardian-remove-dialog__blocker-actions">
              {impact.financial_blockers
                .filter((item) => item.agreement_id != null)
                .map((item) => (
                  <Link
                    key={item.agreement_id}
                    href={`/admin/finance/agreements/${item.agreement_id}`}
                    className="btn btn--secondary btn--sm"
                  >
                    {t('admin.student360.removeGuardianOpenAgreement')}
                  </Link>
                ))}
            </div>
          </div>
        ) : null}

        {(blocker || (blocked && impact?.blocker_message)) ? (
          <div className="guardian-remove-dialog__blocker" role="alert">
            <p>{blocker?.message ?? impact?.blocker_message}</p>
            {blocker?.suggestedActions?.length ? (
              <div className="guardian-remove-dialog__blocker-actions">
                {blocker.suggestedActions.map((action) =>
                  action.href ? (
                    <Link key={action.href} href={action.href} className="btn btn--secondary btn--sm">
                      {action.label}
                    </Link>
                  ) : (
                    <button key={action.label} type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {!blocked && allowedActions?.remove_relationship !== false ? (
          <>
            {impact?.requires_confirmation ? (
              <label className="guardian-remove-dialog__confirm-check">
                <input
                  type="checkbox"
                  checked={confirmAcknowledged}
                  onChange={(e) => setConfirmAcknowledged(e.target.checked)}
                />
                <span>{t('admin.student360.removeGuardianSecondConfirm')}</span>
              </label>
            ) : null}
            <label className="col" style={{ gap: 4 }}>
              <span className="tiny muted">{t('admin.student360.notes')}</span>
              <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </>
        ) : null}

        {error && !blocked ? (
          <p className="tiny guardian-create-field__error">{error}</p>
        ) : null}

        <div className="guardian-flow-drawer__actions">
          {!blocked && allowedActions?.remove_relationship !== false ? (
            <button
              type="submit"
              className="btn btn--danger btn--sm"
              disabled={saving || loadingDetail || removeDisabled}
            >
              {saving ? t('admin.student360.removeGuardianProgress') : t('admin.student360.removeGuardianConfirmAction')}
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost btn--sm" disabled={saving} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
