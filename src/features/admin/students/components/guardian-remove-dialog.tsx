'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import {
  isGuardianRelationshipConfirmRequiredError,
  mapGuardianRemovalBlocker,
  mapGuardianApiError,
} from '../utils/guardian-api-errors';
import {
  buildDetachRelationshipPayload,
  fetchGuardianRelationshipDetail,
  removeGuardianRelationship,
} from '../utils/guardian-remove-relationship';
import {
  canDetachGuardianRelationship,
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
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [impact, setImpact] = useState<GuardianRemovalImpact | null>(null);
  const [allowedActions, setAllowedActions] = useState<GuardianAllowedActions | null>(null);
  const [liveRelationship, setLiveRelationship] = useState<GuardianRelationship | null>(null);
  const [confirmRequired, setConfirmRequired] = useState(false);
  const [confirmAcknowledged, setConfirmAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<ReturnType<typeof mapGuardianRemovalBlocker> | null>(null);

  const activeRelationship = liveRelationship ?? relationship;
  const canDetach = canDetachGuardianRelationship(
    allowedActions ?? activeRelationship?.allowed_actions,
  );

  useEffect(() => {
    if (!open || !relationship) {
      setImpact(null);
      setAllowedActions(null);
      setLiveRelationship(null);
      setError(null);
      setBlocker(null);
      setReason('');
      setConfirmRequired(false);
      setConfirmAcknowledged(false);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    fetchGuardianRelationshipDetail(studentId, relationship.relationship_id)
      .then((detail) => {
        if (cancelled || !detail) return;
        setLiveRelationship(detail.relationship);
        const actions = detail.allowed_actions ?? detail.relationship.allowed_actions ?? null;
        const nextImpact = detail.removal_impact ?? detail.relationship.removal_impact ?? null;
        setAllowedActions(actions);
        setImpact(nextImpact);
        setConfirmRequired(
          nextImpact?.requires_confirmation === true ||
          (nextImpact?.financial_blockers?.length ?? 0) > 0,
        );
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
    if (!canSubmitRemoval(impact, allowedActions ?? activeRelationship.allowed_actions)) return;
    if (confirmRequired && !confirmAcknowledged) return;

    setSaving(true);
    setError(null);
    setBlocker(null);

    const payload = buildDetachRelationshipPayload(confirmRequired, reason);

    const res = await removeGuardianRelationship(
      studentId,
      activeRelationship.relationship_id,
      payload,
    );
    setSaving(false);

    if (res.success) {
      toast.success(t('admin.student360.detachRelationshipSuccess'));
      onClose();
      onRemoved();
      return;
    }

    if (isGuardianRelationshipConfirmRequiredError(res.error)) {
      setConfirmRequired(true);
      setConfirmAcknowledged(false);
      setError(t('admin.student360.detachRelationship409'));
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
  const blocked = isRemovalBlocked(impact, allowedActions ?? activeRelationship.allowed_actions);
  const detachDisabled =
    !canSubmitRemoval(impact, allowedActions ?? activeRelationship.allowed_actions) ||
    (confirmRequired && !confirmAcknowledged);
  const hasProfessionalRole =
    personHasTeacherRole(activeRelationship.guardian) || impact?.multi_role_person === true;
  const roleLabels = formatRoleLabels(
    activeRelationship.guardian.role_labels ?? impact?.role_labels ?? impact?.other_roles,
  );
  const financialWarnings = impact?.financial_blockers ?? [];

  return (
    <SetupDrawer open={open} title={t('admin.student360.detachRelationshipTitle')} onClose={onClose}>
      <form className="guardian-remove-dialog" onSubmit={submit}>
        <div className="guardian-remove-dialog__intro">
          <p>{t('admin.student360.detachRelationshipBody')}</p>
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

        {!canDetach ? (
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

        {financialWarnings.length ? (
          <div className="guardian-remove-dialog__impact guardian-remove-dialog__impact--warn" role="status">
            <p className="guardian-remove-dialog__impact-title">
              {t('admin.student360.detachRelationship409')}
            </p>
            <ul className="guardian-remove-dialog__impact-list">
              {financialWarnings.map((item) => (
                <li key={`${item.code}-${item.agreement_id ?? item.profile_id ?? item.message}`}>{item.message}</li>
              ))}
            </ul>
            <div className="guardian-remove-dialog__blocker-actions">
              {financialWarnings
                .filter((item) => item.agreement_id != null)
                .map((item) => (
                  <Link
                    key={`agreement-${item.agreement_id}`}
                    href={`/admin/finance/agreements/${item.agreement_id}`}
                    className="btn btn--secondary btn--sm"
                  >
                    {t('admin.student360.removeGuardianOpenAgreement')}
                  </Link>
                ))}
              {financialWarnings.some((item) => item.profile_id != null || item.student_id != null) ? (
                <Link
                  href={`/admin/finance/students/${financialWarnings.find((item) => item.student_id != null)?.student_id ?? studentId}`}
                  className="btn btn--secondary btn--sm"
                >
                  {t('admin.student360.financeWorkspace.openFinanceProfile')}
                </Link>
              ) : null}
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

        {canDetach && !blocked ? (
          <>
            {confirmRequired ? (
              <label className="guardian-remove-dialog__confirm-check">
                <input
                  type="checkbox"
                  checked={confirmAcknowledged}
                  onChange={(e) => setConfirmAcknowledged(e.target.checked)}
                />
                <span>{t('admin.student360.detachRelationshipSecondConfirm')}</span>
              </label>
            ) : null}
            <label className="col" style={{ gap: 4 }}>
              <span className="tiny muted">{t('admin.student360.detachRelationshipReason')}</span>
              <textarea className="textarea" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          </>
        ) : null}

        {error && !blocked ? (
          <p className="tiny guardian-create-field__error">{error}</p>
        ) : null}

        <div className="guardian-flow-drawer__actions">
          {canDetach && !blocked ? (
            <button
              type="submit"
              className="btn btn--danger btn--sm"
              disabled={saving || loadingDetail || detachDisabled}
            >
              {saving ? t('admin.student360.detachRelationshipProgress') : t('admin.student360.detachRelationshipConfirm')}
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
