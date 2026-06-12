'use client';

import { useT } from '@/features/i18n/locale-context';

export function AccountFieldsSection({
  mode,
  email,
  login,
  useDifferentLogin,
  onEmailChange,
  onLoginChange,
  onUseDifferentLoginChange,
  emailId = 'account-email',
  loginId = 'account-login',
  disabled = false,
}: {
  mode: 'create' | 'edit';
  email: string;
  login: string;
  useDifferentLogin: boolean;
  onEmailChange: (value: string) => void;
  onLoginChange: (value: string) => void;
  onUseDifferentLoginChange: (value: boolean) => void;
  emailId?: string;
  loginId?: string;
  disabled?: boolean;
}) {
  const t = useT();
  const showLoginField = mode === 'edit' || useDifferentLogin;

  return (
    <fieldset className="col account-fields" style={{ gap: 10 }} disabled={disabled}>
      <legend className="tiny muted">{t('admin.account.accountInformation')}</legend>
      <label className="col" style={{ gap: 4 }} htmlFor={emailId}>
        <span className="tiny muted">{t('admin.email')}</span>
        <input
          id={emailId}
          className="input"
          type="text"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
      </label>
      {mode === 'create' ? (
        <label className="row" style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={useDifferentLogin}
            onChange={(e) => onUseDifferentLoginChange(e.target.checked)}
          />
          <span className="tiny">{t('admin.account.useDifferentLogin')}</span>
        </label>
      ) : null}
      {showLoginField ? (
        <label className="col" style={{ gap: 4 }} htmlFor={loginId}>
          <span className="tiny muted">{t('admin.account.loginName')}</span>
          <input
            id={loginId}
            className="input"
            type="text"
            autoComplete="username"
            value={login}
            onChange={(e) => onLoginChange(e.target.value)}
          />
        </label>
      ) : null}
      {mode === 'edit' ? (
        <p className="tiny muted">{t('admin.account.emailLoginSyncHelp')}</p>
      ) : null}
    </fieldset>
  );
}
