'use client';

import { useEffect, useId, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { mapAccountApiError } from '@/lib/account/account-errors';
import { applyAccountMutationToasts, resolveAccountMutationFeedback } from '@/lib/account/account-mutation-feedback';
import { buildActivateAccountPayload } from '@/lib/account/account-utils';
import { validateAccountPasswordForm, type AccountPasswordFieldErrors } from '@/lib/account/account-password-utils';
import { AccountPasswordFields } from '@/features/admin/account/account-password-fields';
import type { AccountMutationResponse } from '@/types/account';
import './account-ui.css';

type DialogPhase = 'form' | 'success';

interface SuccessState {
  login: string;
  action: AccountMutationResponse['action'];
  password: string;
  mutation: AccountMutationResponse;
}

export function CreateAccountDialog({
  open,
  title,
  endpoint,
  onClose,
  onSuccess,
  defaultEmail = '',
  submitLabel,
  submittingLabel,
}: {
  open: boolean;
  title: string;
  endpoint: string;
  onClose: () => void;
  onSuccess: (result: AccountMutationResponse) => void;
  defaultEmail?: string;
  submitLabel?: string;
  submittingLabel?: string;
  allowInvite?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const formId = useId();
  const emailId = `${formId}-email`;
  const loginId = `${formId}-login`;

  const [phase, setPhase] = useState<DialogPhase>('form');
  const [email, setEmail] = useState(defaultEmail);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AccountPasswordFieldErrors>({});
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  function resetForm() {
    setPhase('form');
    setEmail(defaultEmail);
    setLogin('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setMustChangePassword(false);
    setFieldErrors({});
    setSuccessState(null);
    setCopyHint(null);
    setSaving(false);
  }

  useEffect(() => {
    if (!open) return;
    resetForm();
  }, [open, defaultEmail]);

  function finishAndClose(result: AccountMutationResponse) {
    onSuccess(result);
    resetForm();
    onClose();
  }

  function handleClose() {
    if (phase === 'success' && successState) {
      finishAndClose(successState.mutation);
      return;
    }
    resetForm();
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateAccountPasswordForm({ email, login, password, confirmPassword }, t);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    const payload = buildActivateAccountPayload({
      email,
      login,
      password,
      passwordConfirmation: confirmPassword,
      sendInvite: false,
      mustChangePassword,
    });
    const res = await api.post<AccountMutationResponse>(endpoint, payload);
    setSaving(false);

    if (!res.success) {
      toast.error(mapAccountApiError(res.error, t));
      return;
    }

    const mutation = extractMutation(res.data);
    const resolvedLogin = mutation.account?.login?.trim() || login.trim() || email.trim();
    const feedback = resolveAccountMutationFeedback(res, t, {
      createdKey: 'admin.account.accountCreated',
      updatedKey: 'admin.account.accountUpdated',
      alreadyExistsKey: 'admin.account.accountAlreadyExists',
    });
    if (feedback) applyAccountMutationToasts(feedback, toast);

    if (mutation.action === 'created') {
      setSuccessState({
        login: resolvedLogin,
        action: mutation.action,
        password,
        mutation,
      });
      setPhase('success');
      return;
    }

    if (mutation.action === 'already_exists') {
      setSuccessState({
        login: resolvedLogin,
        action: mutation.action,
        password: '',
        mutation,
      });
      setPhase('success');
      return;
    }

    finishAndClose(mutation);
  }

  async function copyCredentials() {
    if (!successState?.password) return;
    const text = t('admin.account.credentialsCopyText', {
      login: successState.login,
      password: successState.password,
    });
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(t('admin.account.credentialsCopied'));
    } catch {
      setCopyHint(t('admin.account.copyFailed'));
    }
  }

  return (
    <SetupDrawer open={open} title={title} onClose={handleClose}>
      {phase === 'form' ? (
        <form className="create-account-dialog col" style={{ gap: 12 }} onSubmit={submit}>
          <fieldset className="create-account-dialog__section">
            <legend className="create-account-dialog__section-title">{t('admin.account.accountDetails')}</legend>
            <label className="col" style={{ gap: 4 }} htmlFor={emailId}>
              <span className="tiny muted">{t('admin.email')}</span>
              <input
                id={emailId}
                className="input"
                type="text"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
              />
            </label>
            <label className="col" style={{ gap: 4 }} htmlFor={loginId}>
              <span className="tiny muted">{t('admin.account.loginName')}</span>
              <input
                id={loginId}
                className="input"
                type="text"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                aria-invalid={fieldErrors.login ? true : undefined}
                dir="ltr"
              />
              {fieldErrors.login ? (
                <span className="tiny account-password-fields__error" role="alert">
                  {fieldErrors.login}
                </span>
              ) : null}
            </label>
            <p className="tiny muted">{t('admin.account.loginOrEmailHelp')}</p>
          </fieldset>

          <fieldset className="create-account-dialog__section">
            <legend className="create-account-dialog__section-title">{t('admin.account.passwordSection')}</legend>
            <AccountPasswordFields
              password={password}
              confirmPassword={confirmPassword}
              showPassword={showPassword}
              errors={fieldErrors}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onShowPasswordChange={setShowPassword}
            />
          </fieldset>

          <label className="create-account-dialog__checkbox row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={mustChangePassword}
              onChange={(e) => setMustChangePassword(e.target.checked)}
            />
            <span className="tiny">{t('admin.account.mustChangePasswordOnLogin')}</span>
          </label>

          <div className="create-account-dialog__actions col" style={{ gap: 8 }}>
            <button
              type="submit"
              className="btn btn--primary"
              style={{ minHeight: 44, width: '100%' }}
              disabled={saving}
            >
              {saving ? (submittingLabel ?? t('admin.account.creatingAccount')) : (submitLabel ?? t('admin.account.createAccountSubmit'))}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ minHeight: 44, width: '100%' }}
              onClick={handleClose}
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : successState ? (
        <div className="create-account-dialog create-account-dialog--success col" style={{ gap: 16 }}>
          <p className="create-account-dialog__success-lead">
            {successState.action === 'already_exists'
              ? t('admin.account.accountAlreadyExistsWithLogin', { login: successState.login })
              : t('admin.account.accountCreatedSuccess')}
          </p>
          <dl className="create-account-dialog__credentials">
            <div>
              <dt className="tiny muted">{t('admin.account.loginName')}</dt>
              <dd className="mono" dir="ltr">
                {successState.login}
              </dd>
            </div>
            {successState.password ? (
              <div>
                <dt className="tiny muted">{t('admin.account.password')}</dt>
                <dd className="mono" dir="ltr">
                  {showPassword ? successState.password : '••••••••••••'}
                </dd>
              </div>
            ) : null}
          </dl>
          {successState.password ? (
            <div className="create-account-dialog__success-actions col" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? t('admin.account.hidePassword') : t('admin.account.showPassword')}
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={copyCredentials}>
                {t('admin.account.copyCredentials')}
              </button>
              {copyHint ? <p className="tiny muted">{copyHint}</p> : null}
              <p className="tiny muted">{t('admin.account.credentialsOnceHint')}</p>
            </div>
          ) : null}
          <button type="button" className="btn btn--primary" style={{ minHeight: 44 }} onClick={handleClose}>
            {t('common.close')}
          </button>
        </div>
      ) : null}
    </SetupDrawer>
  );
}

function extractMutation(data: unknown): AccountMutationResponse {
  if (!data || typeof data !== 'object') return {};
  return data as AccountMutationResponse;
}
