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
  embedded = false,
  hideEmail = false,
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
  embedded?: boolean;
  hideEmail?: boolean;
}) {
  const t = useT();
  const showLoginField = mode === 'edit' || useDifferentLogin;
  const labelClass = embedded ? 'staff-smart-create__field-label' : 'tiny muted';
  const Wrapper = embedded ? 'div' : 'fieldset';
  const wrapperClass = embedded
    ? 'account-fields account-fields--embedded'
    : 'col account-fields';
  const wrapperStyle = embedded ? undefined : { gap: 10 };

  return (
    <Wrapper
      className={wrapperClass}
      style={wrapperStyle}
      {...(!embedded ? { disabled } : {})}
    >
      {!embedded ? (
        <legend className="tiny muted">{t('admin.account.accountInformation')}</legend>
      ) : null}
      {!hideEmail ? (
      <label className={embedded ? 'staff-smart-create__field' : 'col'} style={embedded ? undefined : { gap: 4 }} htmlFor={emailId}>
        <span className={labelClass}>{t('admin.email')}</span>
        <input
          id={emailId}
          className="input"
          type="email"
          autoComplete="email"
          value={email}
          placeholder={embedded ? t('admin.staffCenter.smartCreate.emailPlaceholder') : undefined}
          onChange={(e) => onEmailChange(e.target.value)}
          dir="ltr"
          disabled={disabled}
        />
      </label>
      ) : null}
      {mode === 'create' ? (
        <label className={`row staff-smart-create__checkbox${embedded ? '' : ''}`} style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={useDifferentLogin}
            onChange={(e) => onUseDifferentLoginChange(e.target.checked)}
            disabled={disabled}
          />
          <span className={embedded ? 'staff-smart-create__checkbox-label' : 'tiny'}>
            {t('admin.account.useDifferentLogin')}
          </span>
        </label>
      ) : null}
      {showLoginField ? (
        <label className={embedded ? 'staff-smart-create__field' : 'col'} style={embedded ? undefined : { gap: 4 }} htmlFor={loginId}>
          <span className={labelClass}>{t('admin.account.loginName')}</span>
          <input
            id={loginId}
            className="input"
            type="text"
            autoComplete="username"
            value={login}
            placeholder={embedded ? t('admin.staffCenter.smartCreate.loginPlaceholder') : undefined}
            onChange={(e) => onLoginChange(e.target.value)}
            dir="ltr"
            disabled={disabled}
          />
        </label>
      ) : null}
      {mode === 'edit' ? (
        <p className="tiny muted">{t('admin.account.emailLoginSyncHelp')}</p>
      ) : null}
    </Wrapper>
  );
}
