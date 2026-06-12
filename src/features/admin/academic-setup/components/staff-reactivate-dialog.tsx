'use client';

import { useId, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { mapAcademicSetupApiError } from '@/features/admin/academic-setup/utils/api-errors';
import { resolveStaffAdminKindLabel } from '@/features/admin/academic-setup/utils/staff-present';
import {
  isStaffInactive,
  resolveStaffLogin,
  staffMutationSuccessKey,
} from '@/features/admin/academic-setup/utils/staff-utils';
import {
  reactivateStaffMember,
} from '@/features/admin/academic-setup/hooks/use-staff';
import type { StaffMember } from '@/types/academic-setup';

export function StaffReactivateDialog({
  open,
  member,
  onClose,
  onSuccess,
}: {
  open: boolean;
  member: StaffMember | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const descId = useId();
  const [saving, setSaving] = useState(false);

  if (!open || !member) return null;

  const login = resolveStaffLogin(member);

  async function confirmReactivate() {
    if (!member) return;
    setSaving(true);
    const res = await reactivateStaffMember(member.id);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAcademicSetupApiError(res.error, t, 'staff'));
      return;
    }
    const key = staffMutationSuccessKey(res.data?.action);
    toast.success(key ? t(key) : t('admin.actionSuccess'));
    onSuccess();
    onClose();
  }

  return (
    <SetupDrawer
      open={open}
      title={t('admin.academicSetup.reactivateStaffTitle')}
      onClose={onClose}
    >
      <div
        className="col staff-reactivate-dialog"
        style={{ gap: 12 }}
        role="dialog"
        aria-describedby={descId}
      >
        <p id={descId} className="staff-reactivate-dialog__desc tiny muted">
          {t('admin.academicSetup.reactivateStaffDescription')}
        </p>
        <dl className="staff-reactivate-summary">
          <div className="staff-reactivate-summary__row">
            <dt className="tiny muted">{t('admin.fullName')}</dt>
            <dd>{member.name}</dd>
          </div>
          <div className="staff-reactivate-summary__row">
            <dt className="tiny muted">{t('admin.academicSetup.adminKindLabel')}</dt>
            <dd>{resolveStaffAdminKindLabel(member.admin_kind, t)}</dd>
          </div>
          <div className="staff-reactivate-summary__row">
            <dt className="tiny muted">{t('admin.email')}</dt>
            <dd>{member.email ?? t('common.dash')}</dd>
          </div>
          {login ? (
            <div className="staff-reactivate-summary__row">
              <dt className="tiny muted">{t('admin.account.loginName')}</dt>
              <dd className="academic-staff-card__login-value mono" title={login}>{login}</dd>
            </div>
          ) : null}
        </dl>
        <div className="staff-reactivate-dialog__actions">
          <button
            type="button"
            className="btn btn--ghost"
            style={{ minHeight: 44 }}
            disabled={saving}
            onClick={onClose}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            style={{ minHeight: 44 }}
            disabled={saving}
            onClick={confirmReactivate}
          >
            {saving ? t('common.saving') : t('admin.academicSetup.reactivateStaff')}
          </button>
        </div>
      </div>
    </SetupDrawer>
  );
}

export function staffShowsReactivate(member: StaffMember, canManage: boolean): boolean {
  return canManage && isStaffInactive(member) && member.can_reactivate === true;
}

export function staffShowsDeactivate(member: StaffMember, canManage: boolean): boolean {
  return canManage && !isStaffInactive(member) && member.can_deactivate === true;
}
