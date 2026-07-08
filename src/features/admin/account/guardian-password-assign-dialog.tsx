'use client';

import { useEffect, useId, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { mapGuardianPasswordApiError } from '@/lib/account/guardian-password-errors';
import {
  applyGeneratedStaffPassword,
  clearStaffPasswordState,
  computeStaffPasswordStrength,
  normalizeStaffPasswordPolicy,
  validateStaffPasswordForm,
} from '@/features/admin/academic-setup/utils/staff-password-utils';
import { assignParentAccountPassword } from '@/features/admin/parents/utils/parent-account-password-api';
import type { GuardianPasswordActionMode } from '@/features/admin/parents/utils/guardian-password-contract';
import type { StaffPasswordPolicy } from '@/types/academic-setup';

export function GuardianPasswordAssignDialog({
  open,
  guardianId,
  guardianName,
  mode,
  policy,
  onClose,
  onSuccess,
}: {
  open: boolean;
  guardianId: number | null;
  guardianName?: string;
  mode: GuardianPasswordActionMode;
  policy?: StaffPasswordPolicy | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const formId = useId();
  const normalizedPolicy = normalizeStaffPasswordPolicy(policy);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      clearStaffPasswordState({ setPassword, setConfirmPassword, setShowPassword });
      setFieldErrors({});
      setCopied(false);
      return;
    }
    applyGeneratedStaffPassword(
      { setPassword, setConfirmPassword, setShowPassword },
      normalizedPolicy,
    );
    setFieldErrors({});
    setCopied(false);
  }, [open, normalizedPolicy.min_length, normalizedPolicy.requires_letter, normalizedPolicy.requires_number]);

  if (!open || guardianId == null) return null;

  const strength = computeStaffPasswordStrength(password, normalizedPolicy);
  const title =
    mode === 'reset'
      ? t('admin.guardianAccount.password.resetTitle', { name: guardianName ?? '' })
      : t('admin.guardianAccount.password.setTitle', { name: guardianName ?? '' });
  const submitLabel =
    mode === 'reset'
      ? t('admin.guardianAccount.password.resetSubmit')
      : t('admin.guardianAccount.password.setSubmit');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateStaffPasswordForm(
      { password, confirmPassword, requirePassword: true },
      normalizedPolicy,
      t,
    );
    setFieldErrors(validation.errors);
    if (!validation.valid) return;

    setSaving(true);
    const res = await assignParentAccountPassword(guardianId!, {
      password,
      password_confirm: confirmPassword,
    });
    setSaving(false);

    clearStaffPasswordState({ setPassword, setConfirmPassword, setShowPassword });
    setFieldErrors({});

    if (!res.success) {
      toast.error(mapGuardianPasswordApiError(res.error, t));
      return;
    }

    toast.success(t('admin.guardianAccount.password.success'));
    onSuccess?.();
    onClose();
  }

  function handleGenerate() {
    applyGeneratedStaffPassword(
      { setPassword, setConfirmPassword, setShowPassword },
      normalizedPolicy,
    );
    setCopied(false);
  }

  async function handleCopy() {
    if (!password || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <div className="academic-setup-drawer-backdrop" role="presentation" onClick={onClose} />
      <div className="staff-reset-password-dialog" role="dialog" aria-modal="true">
        <div className="staff-reset-password-dialog__head">
          <strong>{title}</strong>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
        <form id={formId} className="staff-reset-password-dialog__body col" style={{ gap: 12 }} onSubmit={handleSubmit}>
          <p className="tiny muted">{t('admin.guardianAccount.password.subtitle')}</p>
          <p className="tiny muted">{t('admin.guardianAccount.password.notShownAfterSave')}</p>

          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.academicSetup.staffPassword.password')}</span>
            <div className="account-password-fields__input-row">
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword
                  ? t('admin.academicSetup.staffPassword.hidePassword')
                  : t('admin.academicSetup.staffPassword.showPassword')}
              </button>
            </div>
            {fieldErrors.password ? (
              <span className="tiny account-password-fields__error" role="alert">
                {fieldErrors.password}
              </span>
            ) : null}
          </label>

          {strength !== 'empty' ? (
            <div className={`account-password-strength account-password-strength--${strength}`}>
              <span className="account-password-strength__bar" aria-hidden="true" />
              <span className="tiny">
                {t(`admin.academicSetup.staffPassword.strength.${strength}`)}
              </span>
            </div>
          ) : null}

          <div className="account-password-fields__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleGenerate}>
              {t('admin.guardianAccount.password.regeneratePassword')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => void handleCopy()} disabled={!password}>
              {copied
                ? t('admin.guardianAccount.password.copied')
                : t('admin.guardianAccount.password.copyPassword')}
            </button>
          </div>

          <label className="col" style={{ gap: 4 }}>
            <span className="tiny muted">{t('admin.academicSetup.staffPassword.confirmPassword')}</span>
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              dir="ltr"
            />
            {fieldErrors.confirmPassword ? (
              <span className="tiny account-password-fields__error" role="alert">
                {fieldErrors.confirmPassword}
              </span>
            ) : null}
          </label>
        </form>
        <div className="staff-reset-password-dialog__footer row" style={{ gap: 8 }}>
          <button type="submit" form={formId} className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? t('common.saving') : submitLabel}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </>
  );
}
