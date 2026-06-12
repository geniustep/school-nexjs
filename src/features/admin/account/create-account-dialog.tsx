'use client';

import { useEffect, useId, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { mapAccountApiError } from '@/lib/account/account-errors';
import {
  applyAccountMutationToasts,
  resolveAccountMutationFeedback,
} from '@/lib/account/account-mutation-feedback';
import {
  buildActivateAccountPayload,
  validateActivateAccountInput,
} from '@/lib/account/account-utils';
import type { AccountMutationResponse } from '@/types/account';

export function CreateAccountDialog({
  open,
  title,
  endpoint,
  onClose,
  onSuccess,
  defaultEmail = '',
  allowInvite = true,
}: {
  open: boolean;
  title: string;
  endpoint: string;
  onClose: () => void;
  onSuccess: (result: AccountMutationResponse) => void;
  defaultEmail?: string;
  allowInvite?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const formId = useId();
  const emailId = `${formId}-email`;
  const loginId = `${formId}-login`;
  const [email, setEmail] = useState(defaultEmail);
  const [login, setLogin] = useState('');
  const [sendInvite, setSendInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(defaultEmail);
    setLogin('');
    setSendInvite(false);
    setFieldError(null);
  }, [open, defaultEmail]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateActivateAccountInput(email, login)) {
      setFieldError(t('admin.account.errors.loginRequired'));
      return;
    }
    if (sendInvite && !email.trim()) {
      setFieldError(t('admin.account.errors.emailRequiredForInvite'));
      return;
    }
    setFieldError(null);
    setSaving(true);
    const payload = buildActivateAccountPayload({ email, login, sendInvite });
    const res = await api.post<AccountMutationResponse>(endpoint, payload);
    setSaving(false);
    if (!res.success) {
      toast.error(mapAccountApiError(res.error, t));
      return;
    }
    const feedback = resolveAccountMutationFeedback(res, t, {
      createdKey: sendInvite
        ? 'admin.account.accountCreatedInviteRequested'
        : 'admin.account.accountCreated',
      updatedKey: 'admin.account.accountUpdated',
      alreadyExistsKey: 'admin.account.accountAlreadyExists',
    });
    if (feedback) applyAccountMutationToasts(feedback, toast);
    onSuccess(extractMutation(res.data));
    onClose();
  }

  return (
    <SetupDrawer open={open} title={title} onClose={onClose}>
      <form className="col" style={{ gap: 12 }} onSubmit={submit}>
        <label className="col" style={{ gap: 4 }} htmlFor={emailId}>
          <span className="tiny muted">{t('admin.email')}</span>
          <input
            id={emailId}
            className="input"
            type="text"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? `${formId}-error` : undefined}
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
            aria-invalid={fieldError ? true : undefined}
          />
        </label>
        {allowInvite ? (
          <label className="row" style={{ gap: 8, minHeight: 44, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
            />
            <span className="tiny">{t('admin.account.sendInvite')}</span>
          </label>
        ) : null}
        {fieldError ? (
          <p id={`${formId}-error`} className="tiny" style={{ color: 'var(--danger)' }} role="alert">
            {fieldError}
          </p>
        ) : null}
        <p className="tiny muted">{t('admin.account.activateAccountHelp')}</p>
        <div className="col" style={{ gap: 8 }}>
          <button
            type="submit"
            className="btn btn--primary"
            style={{ minHeight: 44, width: '100%' }}
            disabled={saving}
          >
            {saving
              ? t('common.saving')
              : sendInvite
                ? t('admin.account.createAndSendInvite')
                : t('admin.account.createAccount')}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ minHeight: 44, width: '100%' }}
            onClick={onClose}
            disabled={saving}
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}

function extractMutation(data: unknown): AccountMutationResponse {
  if (!data || typeof data !== 'object') return {};
  return data as AccountMutationResponse;
}
