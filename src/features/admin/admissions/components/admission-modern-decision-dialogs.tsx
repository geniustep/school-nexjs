'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { executeAdmissionAction } from '../api/admissions-api';
import { mapAdmissionActionError } from '../utils/admission-action-errors';
import { validateReject } from '../utils/admission-action-validation';
import { didFamilyApprovalFailToAdvanceStatus } from '../utils/admission-family-approval-status';
import { resolveApplicationStatus } from '../utils/admission-modern-status';

export function AdmissionModernDecisionDialog({
  admissionId, action, open, onClose, onSuccess,
}: {
  admissionId: number;
  action: 'accept' | 'reject' | 'record_family_approval' | 'accept_and_record_family_approval';
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validation = action === 'reject' ? validateReject({ reason: note }) : null;
    if (validation) return setError(t(validation));
    setSaving(true);
    const needsConfirm =
      action === 'record_family_approval' || action === 'accept_and_record_family_approval';
    const res = await executeAdmissionAction(
      admissionId,
      {
        action,
        // Backend marks these actions requires_confirmation — dialog submit is the confirm.
        ...(needsConfirm ? { confirmed: true } : {}),
        note: note.trim() || undefined,
        reason: action === 'reject' ? note.trim() : undefined,
      },
      activeSchoolId == null ? undefined : { active_school_id: activeSchoolId },
    );
    setSaving(false);
    if (!res.success) return setError(t(mapAdmissionActionError(res.error)));
    if (needsConfirm && didFamilyApprovalFailToAdvanceStatus(action, res.data)) {
      setError(
        t('admin.admissions.actionErrors.familyApprovalStatusNotAdvanced', {
          status: resolveApplicationStatus(res.data) ?? '—',
        }),
      );
      onSuccess();
      return;
    }
    onSuccess();
    onClose();
  }
  const labelKey =
    action === 'record_family_approval'
      ? 'admin.admissions.actions.recordFamilyApproval'
      : action === 'accept_and_record_family_approval'
        ? 'admin.admissions.actions.acceptAndRecordFamilyApproval'
        : `admin.admissions.actions.${action}`;
  const label = t(labelKey);
  const noteOptional =
    action === 'record_family_approval' || action === 'accept_and_record_family_approval';
  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form className="card modal-panel confirmation-dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2>{label}</h2>{error ? <div className="alert alert--error">{error}</div> : null}
        {!noteOptional ? (
          <label className="field">
            <span>{action === 'reject' ? `${t('admin.admissions.rejection.reason')} *` : t('common.note')}</span>
            <textarea
              className="input"
              required={action === 'reject'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        ) : null}
        <div className="confirmation-dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn btn--primary" disabled={saving}>{saving ? t('common.saving') : label}</button>
        </div>
      </form>
    </div>, document.body,
  );
}
