'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { LoginAmbientBackground } from '@/features/auth/login-branded-background';
import { LoginBrandPanel } from '@/features/auth/login-brand-panel';
import { useLocale } from '@/features/i18n/locale-context';
import { loginBrandingStyle, loginPageBranded } from '@/lib/public-school-branding/client';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';

type Stage = 'verify' | 'password' | 'done';
type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error?: { code?: string; message?: string } };

const COPY = {
  ar: {
    title: 'تفعيل حسابك', intro: 'أدخل رقم هاتفك والرمز المكوّن من 6 أرقام الذي وصلك عبر WhatsApp.',
    phone: 'رقم الهاتف', phoneHint: 'يمكنك إدخال الرقم المحلي، مثل 0612345678، أو الرقم الدولي.',
    code: 'رمز التفعيل', verify: 'تحقق من الرمز', checking: 'جارٍ التحقق…',
    passwordTitle: 'أنشئ كلمة المرور', passwordIntro: 'تم التحقق من الرمز. اختر كلمة مرور آمنة لحسابك.',
    password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور', save: 'حفظ كلمة المرور', saving: 'جارٍ الحفظ…',
    mismatch: 'كلمتا المرور غير متطابقتين.', invalid: 'تعذر التحقق من البيانات. راجع الرقم والرمز ثم حاول مجددًا.',
    expired: 'انتهت جلسة التفعيل. اطلب رمزًا جديدًا من إدارة المؤسسة.', network: 'تعذر الاتصال بالخادم. حاول مجددًا.',
    done: 'تم تفعيل حسابك', loginLabel: 'اسم الدخول', login: 'الانتقال إلى تسجيل الدخول', back: 'العودة إلى تسجيل الدخول',
  },
  fr: {
    title: 'Activer votre compte', intro: 'Saisissez votre téléphone et le code à 6 chiffres reçu sur WhatsApp.',
    phone: 'Téléphone', phoneHint: 'Le format local (ex. 0612345678) ou international est accepté.', code: "Code d’activation",
    verify: 'Vérifier le code', checking: 'Vérification…', passwordTitle: 'Créer le mot de passe', passwordIntro: 'Code vérifié. Choisissez un mot de passe sécurisé.',
    password: 'Mot de passe', confirm: 'Confirmer le mot de passe', save: 'Enregistrer', saving: 'Enregistrement…', mismatch: 'Les mots de passe ne correspondent pas.',
    invalid: 'Vérification impossible. Contrôlez le téléphone et le code.', expired: 'La session a expiré. Demandez un nouveau code.', network: 'Serveur inaccessible. Réessayez.',
    done: 'Compte activé', loginLabel: 'Identifiant', login: 'Se connecter', back: 'Retour à la connexion',
  },
  en: {
    title: 'Activate your account', intro: 'Enter your phone number and the 6-digit code received on WhatsApp.', phone: 'Phone number',
    phoneHint: 'Local (for example 0612345678) and international formats are accepted.', code: 'Activation code', verify: 'Verify code', checking: 'Verifying…',
    passwordTitle: 'Create your password', passwordIntro: 'Code verified. Choose a secure password.', password: 'Password', confirm: 'Confirm password',
    save: 'Save password', saving: 'Saving…', mismatch: 'Passwords do not match.', invalid: 'Verification failed. Check the phone and code.',
    expired: 'The activation session expired. Ask for a new code.', network: 'Could not reach the server. Try again.', done: 'Account activated',
    loginLabel: 'Login', login: 'Go to sign in', back: 'Back to sign in',
  },
  es: {
    title: 'Activar tu cuenta', intro: 'Introduce tu teléfono y el código de 6 dígitos recibido por WhatsApp.', phone: 'Teléfono',
    phoneHint: 'Se acepta el formato local o internacional.', code: 'Código de activación', verify: 'Verificar código', checking: 'Verificando…',
    passwordTitle: 'Crear contraseña', passwordIntro: 'Código verificado. Elige una contraseña segura.', password: 'Contraseña', confirm: 'Confirmar contraseña',
    save: 'Guardar contraseña', saving: 'Guardando…', mismatch: 'Las contraseñas no coinciden.', invalid: 'No se pudo verificar. Revisa el teléfono y el código.',
    expired: 'La sesión expiró. Solicita un código nuevo.', network: 'No se pudo conectar. Inténtalo de nuevo.', done: 'Cuenta activada',
    loginLabel: 'Usuario', login: 'Ir al inicio de sesión', back: 'Volver al inicio de sesión',
  },
} as const;

async function post<T>(path: string, body: unknown): Promise<ApiEnvelope<T>> {
  const response = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
  });
  return response.json() as Promise<ApiEnvelope<T>>;
}

export function AccountActivationForm({ branding }: { branding: LoginSchoolBrandingView }) {
  const { locale } = useLocale();
  const c = COPY[locale];
  const [stage, setStage] = useState<Stage>('verify');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [login, setLogin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify(event: React.FormEvent) {
    event.preventDefault(); setError(null); setBusy(true);
    try {
      const result = await post<{ setup_token?: string }>('/api/auth/account-activation/verify', { phone: phone.trim(), otp });
      const token = result.success ? result.data.setup_token : null;
      if (!token) { setError(c.invalid); return; }
      setSetupToken(token); setOtp(''); setStage('password');
    } catch { setError(c.network); } finally { setBusy(false); }
  }

  async function setAccountPassword(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    if (password !== confirm) { setError(c.mismatch); return; }
    if (!setupToken) { setStage('verify'); setError(c.expired); return; }
    setBusy(true);
    try {
      const result = await post<{ login?: string }>('/api/auth/account-activation/set-password', {
        setup_token: setupToken, password, password_confirm: confirm,
      });
      if (!result.success) {
        if (result.error?.code?.includes('expired') || result.error?.code?.includes('token')) {
          setSetupToken(null); setPassword(''); setConfirm(''); setStage('verify'); setError(c.expired);
        } else setError(result.error?.message || c.invalid);
        return;
      }
      setLogin(result.data.login ?? ''); setSetupToken(null); setPassword(''); setConfirm(''); setStage('done');
    } catch { setError(c.network); } finally { setBusy(false); }
  }

  const branded = loginPageBranded(branding);
  return (
    <div className="login-page" data-branded={branded ? 'true' : undefined} style={loginBrandingStyle(branding)}>
      <LoginAmbientBackground />
      <div className="login-page__locale"><LocaleSwitcher variant="login" /></div>
      <main className="login-page__shell">
        <LoginBrandPanel branding={branding} schoolName={branding.schoolName ?? 'Raqeem'} tagline={branding.welcomeSubtitle} yearLabel={branding.academicYearLabel} />
        <div className="login-card activation-card" data-submitting={busy ? 'true' : undefined}>
          <div className="login-card__mark"><BrandLogo variant="full" className="login-card__raqeem-logo" /></div>
          <h1 className="login-card__title">{stage === 'password' ? c.passwordTitle : stage === 'done' ? c.done : c.title}</h1>
          <p className="login-card__sub">{stage === 'password' ? c.passwordIntro : stage === 'verify' ? c.intro : null}</p>
          {error && <div className="form-error" role="alert">{error}</div>}
          {stage === 'verify' && <form onSubmit={verify} aria-busy={busy}>
            <div className="field"><label htmlFor="activation-phone">{c.phone}</label><input id="activation-phone" className="input" type="tel" dir="ltr" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} required disabled={busy} /><small className="activation-card__hint">{c.phoneHint}</small></div>
            <div className="field"><label htmlFor="activation-otp">{c.code}</label><input id="activation-otp" className="input activation-card__otp" type="text" dir="ltr" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required disabled={busy} /></div>
            <button className="btn btn--primary btn--block login-card__submit" type="submit" disabled={busy || otp.length !== 6}>{busy ? c.checking : c.verify}</button>
          </form>}
          {stage === 'password' && <form onSubmit={setAccountPassword} aria-busy={busy}>
            <div className="field"><label htmlFor="activation-password">{c.password}</label><input id="activation-password" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} /></div>
            <div className="field"><label htmlFor="activation-confirm">{c.confirm}</label><input id="activation-confirm" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={busy} /></div>
            <button className="btn btn--primary btn--block login-card__submit" type="submit" disabled={busy}>{busy ? c.saving : c.save}</button>
          </form>}
          {stage === 'done' && <div className="activation-card__success">
            {login && <div><span>{c.loginLabel}</span><strong dir="ltr">{login}</strong></div>}
            <Link className="btn btn--primary btn--block" href="/login">{c.login}</Link>
          </div>}
          {stage !== 'done' && <Link className="activation-card__back" href="/login">{c.back}</Link>}
        </div>
      </main>
    </div>
  );
}
