'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { mapGuardianRemovalBlocker, mapGuardianApiError } from '../utils/guardian-api-errors';
import {
  fetchGuardianRemovalImpact,
  removeGuardianRelationship,
} from '../utils/guardian-remove-relationship';
import {
  impactSummaryLines,
  isRemovalBlocked,
} from '../utils/guardian-removal-shared';
import {
  formatRoleLabels,
  personHasTeacherRole,
} from '../utils/person-role-presentation';
import { relationshipTypeLabel } from '../utils/relationship-types';
import type { GuardianRelationship, GuardianRemovalImpact } from '@/types/student-360';

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
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [impact, setImpact] = useState<GuardianRemovalImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<ReturnType<typeof mapGuardianRemovalBlocker> | null>(null);

  useEffect(() => {
    if (!open || !relationship) {
      setImpact(null);
      setError(null);
      setBlocker(null);
      setNotes('');
      return;
    }

    const embedded = relationship.removal_impact;
    if (embedded) {
      setImpact(embedded);
      return;
    }

    let cancelled = false;
    setLoadingImpact(true);
    fetchGuardianRemovalImpact(studentId, relationship.relationship_id)
      .then((next) => {
        if (!cancelled) setImpact(next);
      })
      .finally(() => {
        if (!cancelled) setLoadingImpact(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, relationship, studentId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!relationship || saving) return;
    if (isRemovalBlocked(impact)) return;

    setSaving(true);
    setError(null);
    setBlocker(null);

    const payload: { notes?: string } = {};
    if (notes.trim()) payload.notes = notes.trim();

    const res = await removeGuardianRelationship(
      studentId,
      relationship.relationship_id,
      payload,
    );
    setSaving(false);

    if (res.success) {
      const multiRole = personHasTeacherRole(relationship.guardian) || (impact?.other_roles?.length ?? 0) > 0;
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

  if (!open || !relationship) return null;

  const impactLines = impactSummaryLines(impact);
  const blocked = isRemovalBlocked(impact);
  const hasProfessionalRole = personHasTeacherRole(relationship.guardian);
  const roleLabels = formatRoleLabels(
    impact?.role_labels ?? relationship.guardian.role_labels ?? impact?.other_roles,
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
          <strong dir="auto">{relationship.guardian.name}</strong>
          <p className="tiny">
            {t('admin.student360.relationshipTypeLabel')}:{' '}
            {relationshipTypeLabel(t, relationship.relationship_type)}
          </p>
          {roleLabels ? (
            <p className="tiny muted">
              {t('admin.student360.currentRoles')}: {roleLabels}
            </p>
          ) : null}
          {hasProfessionalRole ? (
            <p className="tiny guardian-remove-dialog__professional-note">
              {t('admin.student360.removeGuardianTeacherNote', { name: relationship.guardian.name })}
            </p>
          ) : null}
        </div>

        {loadingImpact ? (
          <p className="tiny muted">{t('admin.student360.removeGuardianImpactLoading')}</p>
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
            {impact?.suggested_actions?.length ? (
              <div className="guardian-remove-dialog__blocker-actions">
                {impact.suggested_actions.map((action) =>
                  action.href ? (
                    <Link key={`${action.href}-${action.label}`} href={action.href} className="btn btn--secondary btn--sm">
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={onClose}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {!blocked ? (
          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.student360.notes')}</span>
            <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        ) : null}

        {error && !blocked ? (
          <p className="tiny guardian-create-field__error">{error}</p>
        ) : null}

        <div className="guardian-flow-drawer__actions">
          {!blocked ? (
            <button type="submit" className="btn btn--danger btn--sm" disabled={saving || loadingImpact}>
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
