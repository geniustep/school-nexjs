'use client';

import { useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { formatRoleLabels } from '../utils/person-role-presentation';
import { restoreGuardianProfile } from '../utils/guardian-profile-api';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';

type RestoreTarget = {
  id: number;
  name: string;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  role_labels?: string[];
  has_user_account?: boolean;
  has_account?: boolean;
};

export function GuardianRestoreDialog({
  open,
  target,
  onClose,
  onRestored,
}: {
  open: boolean;
  target: RestoreTarget | null;
  onClose: () => void;
  onRestored: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function confirmRestore() {
    if (!target) return;
    setSaving(true);
    const res = await restoreGuardianProfile(target.id);
    setSaving(false);
    if (res.success) {
      toast.success(t('admin.guardianProfile.restoreSuccess'));
      onClose();
      onRestored();
      return;
    }
    toast.error(res.error.message);
  }

  if (!open || !target) return null;

  const roleLine = formatRoleLabels(target.role_labels);
  const phone = target.phone ?? target.mobile ?? null;
  const hasAccount = target.has_user_account === true || target.has_account === true;

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.guardianProfile.restoreTitle')}
      body={
        <div className="guardian-restore-dialog">
          <p>{t('admin.guardianProfile.restoreBody')}</p>
          <div className="guardian-selected-summary">
            <strong dir="auto">{target.name}</strong>
            {phone ? (
              <span className="tiny mono" dir="ltr">
                {formatMoroccanPhoneDisplay(phone)}
              </span>
            ) : null}
            {target.email ? (
              <span className="tiny" dir="ltr">
                {target.email}
              </span>
            ) : null}
            {roleLine ? <p className="tiny muted">{roleLine}</p> : null}
            <p className="tiny muted">
              {hasAccount ? t('admin.student360.hasLoginAccount') : t('admin.student360.noLoginAccount')}
            </p>
          </div>
        </div>
      }
      confirmLabel={saving ? t('admin.guardianProfile.restoringProfile') : t('admin.guardianProfile.restoreAction')}
      loading={saving}
      onConfirm={confirmRestore}
      onClose={onClose}
    />
  );
}
