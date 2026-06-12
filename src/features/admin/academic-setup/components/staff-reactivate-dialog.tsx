'use client';

import { useId, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { mapAcademicSetupApiError } from '@/features/admin/academic-setup/utils/api-errors';
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
  const titleId = useId();
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
      <div className="col" style={{ gap: 12 }} role="dialog" aria-labelledby={titleId}>
        <p id={titleId} className="tiny muted">
          {t('admin.academicSetup.reactivateStaffDescription')}
        </p>
        <dl className="col staff-reactivate-summary" style={{ gap: 8 }}>
          <div className="col" style={{ gap: 2 }}>
            <dt className="tiny muted">{t('admin.fullName')}</dt>
            <dd>{member.name}</dd>
          </div>
          <div className="col" style={{ gap: 2 }}>
            <dt className="tiny muted">{t('admin.email')}</dt>
            <dd>{member.email ?? t('common.dash')}</dd>
          </div>
          {login ? (
            <div className="col" style={{ gap: 2 }}>
              <dt className="tiny muted">{t('admin.account.loginName')}</dt>
              <dd className="mono">{login}</dd>
            </div>
          ) : null}
          <div className="col" style={{ gap: 2 }}>
            <dt className="tiny muted">{t('admin.academicSetup.adminKindLabel')}</dt>
            <dd>{t(`admin.academicSetup.adminKind.${member.admin_kind}`)}</dd>
          </div>
        </dl>
        <div className="col" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn--primary"
            style={{ minHeight: 44, width: '100%' }}
            disabled={saving}
            onClick={confirmReactivate}
          >
            {saving ? t('common.saving') : t('admin.academicSetup.reactivateStaff')}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ minHeight: 44, width: '100%' }}
            disabled={saving}
            onClick={onClose}
          >
            {t('common.cancel')}
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
