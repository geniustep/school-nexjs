'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { LoginAmbientBackground } from '@/features/auth/login-branded-background';
import { LoginBrandPanel } from '@/features/auth/login-brand-panel';
import { useLocale } from '@/features/i18n/locale-context';
import { loginBrandingStyle, loginPageBranded } from '@/lib/public-school-branding/client';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';
import { copyTextToClipboard } from '@/lib/utils/copy-text';
import { storeActivationLoginHandoff } from '@/lib/auth/account-activation-login-handoff';

type Stage = 'checking' | 'ready' | 'done' | 'invalid';
type ApiEnvelope<T> = { success: true; data: T } | { success: false; error?: { code?: string } };
type ActivationIdentity = {
  status?: string;
  recipient_name_ar?: string;
  recipient_name_fr?: string;
  school_name_ar?: string;
  school_name_fr?: string;
  login?: string;
};

const COPY = {
  ar: { checking: 'جارٍ التحقق من رابط التفعيل…', title: 'إنشاء كلمة المرور', intro: 'اختر كلمة مرور آمنة لإكمال تفعيل حسابك.', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور', save: 'تفعيل الحساب', saving: 'جارٍ التفعيل…', mismatch: 'كلمتا المرور غير متطابقتين.', invalid: 'رابط التفعيل غير صالح أو منتهي الصلاحية. اطلب رابطًا جديدًا من إدارة المؤسسة.', policy: 'كلمة المرور لا تستوفي متطلبات الأمان.', network: 'تعذر الاتصال بالخادم. حاول مجددًا.', done: 'تم تفعيل حسابك بنجاح', login: 'الانتقال إلى تسجيل الدخول', back: 'العودة إلى تسجيل الدخول', greeting: 'مرحبًا', institution: 'المؤسسة', username: 'اسم المستخدم للدخول', copyUsername: 'نسخ اسم المستخدم', copied: 'تم النسخ' },
  fr: { checking: 'Vérification du lien…', title: 'Créer le mot de passe', intro: 'Choisissez un mot de passe sécurisé pour activer votre compte.', password: 'Mot de passe', confirm: 'Confirmer le mot de passe', save: 'Activer le compte', saving: 'Activation…', mismatch: 'Les mots de passe ne correspondent pas.', invalid: "Le lien d’activation est invalide ou expiré. Demandez un nouveau lien à l’établissement.", policy: 'Le mot de passe ne respecte pas les exigences de sécurité.', network: 'Serveur inaccessible. Réessayez.', done: 'Votre compte a été activé', login: 'Se connecter', back: 'Retour à la connexion', greeting: 'Bonjour', institution: 'Établissement', username: 'Identifiant de connexion', copyUsername: "Copier l’identifiant", copied: 'Copié' },
  en: { checking: 'Checking activation link…', title: 'Create password', intro: 'Choose a secure password to activate your account.', password: 'Password', confirm: 'Confirm password', save: 'Activate account', saving: 'Activating…', mismatch: 'Passwords do not match.', invalid: 'The activation link is invalid or expired. Ask the institution for a new link.', policy: 'The password does not meet the security requirements.', network: 'Could not reach the server. Try again.', done: 'Your account has been activated', login: 'Go to sign in', back: 'Back to sign in', greeting: 'Hello', institution: 'Institution', username: 'Username', copyUsername: 'Copy username', copied: 'Copied' },
  es: { checking: 'Comprobando el enlace…', title: 'Crear contraseña', intro: 'Elige una contraseña segura para activar tu cuenta.', password: 'Contraseña', confirm: 'Confirmar contraseña', save: 'Activar cuenta', saving: 'Activando…', mismatch: 'Las contraseñas no coinciden.', invalid: 'El enlace no es válido o ha caducado. Solicita uno nuevo.', policy: 'La contraseña no cumple los requisitos de seguridad.', network: 'No se pudo conectar. Inténtalo de nuevo.', done: 'Tu cuenta ha sido activada', login: 'Iniciar sesión', back: 'Volver al inicio de sesión', greeting: 'Hola', institution: 'Centro educativo', username: 'Nombre de usuario', copyUsername: 'Copiar nombre de usuario', copied: 'Copiado' },
} as const;

async function post<T>(stage: 'inspect' | 'complete', body: unknown): Promise<ApiEnvelope<T>> {
  const response = await fetch(`/api/auth/account-activation-link/${stage}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store',
  });
  return response.json() as Promise<ApiEnvelope<T>>;
}

export function AccountActivationLinkForm({ branding, token }: { branding: LoginSchoolBrandingView; token: string }) {
  const { locale } = useLocale();
  const c = COPY[locale];
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('checking');
  const [identity, setIdentity] = useState<ActivationIdentity | null>(null);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void post<ActivationIdentity>('inspect', { token })
      .then((result) => {
        if (!active) return;
        if (result.success && result.data.status === 'ready') {
          setIdentity(result.data);
          setStage('ready');
        } else {
          setStage('invalid');
        }
      })
      .catch(() => { if (active) { setError(c.network); setStage('invalid'); } });
    return () => { active = false; };
  }, [token, c.network]);

  async function complete(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) { setError(c.mismatch); return; }
    setBusy(true);
    try {
      const result = await post<{ status?: string }>('complete', { token, password });
      if (result.success && result.data.status === 'activated') {
        setPassword(''); setConfirm(''); setStage('done');
      } else if (!result.success && (result.error?.code === 'password_policy_violation' || result.error?.code === 'password_required')) {
        setError(c.policy);
      } else {
        setPassword(''); setConfirm(''); setStage('invalid');
      }
    } catch { setError(c.network); } finally { setBusy(false); }
  }

  async function copyLogin() {
    if (!identity?.login) return;
    setCopied(await copyTextToClipboard(identity.login));
  }

  function goToLogin() {
    if (identity?.login) storeActivationLoginHandoff(identity.login);
    router.push('/login');
  }

  const recipientName = locale === 'ar' ? identity?.recipient_name_ar : identity?.recipient_name_fr;
  const schoolName = locale === 'ar' ? identity?.school_name_ar : identity?.school_name_fr;
  const showIdentity = Boolean(recipientName && schoolName && identity?.login);

  const branded = loginPageBranded(branding);
  return (
    <div className="login-page" data-branded={branded ? 'true' : undefined} style={loginBrandingStyle(branding)}>
      <LoginAmbientBackground />
      <div className="login-page__locale"><LocaleSwitcher variant="login" /></div>
      <main className="login-page__shell">
        <LoginBrandPanel branding={branding} schoolName={schoolName ?? branding.schoolName ?? 'Raqeem'} tagline={branding.welcomeSubtitle} yearLabel={branding.academicYearLabel} />
        <div className="login-card activation-card" data-submitting={busy ? 'true' : undefined}>
          <div className="login-card__mark"><BrandLogo variant="full" className="login-card__raqeem-logo" /></div>
          <h1 className="login-card__title">{stage === 'done' ? c.done : stage === 'invalid' ? c.invalid : stage === 'checking' ? c.checking : c.title}</h1>
          {stage === 'ready' && <p className="login-card__sub">{c.intro}</p>}
          {showIdentity && (stage === 'ready' || stage === 'done') && (
            <section className="activation-card__identity" aria-label={c.username}>
              <p className="activation-card__greeting">{c.greeting}، {recipientName}</p>
              <p className="activation-card__institution">{c.institution}: {schoolName}</p>
              <div className="activation-card__login">
                <span>{c.username}</span>
                <strong dir="ltr">{identity?.login}</strong>
                <button className="btn btn--ghost btn--sm" type="button" onClick={copyLogin}>{copied ? c.copied : c.copyUsername}</button>
              </div>
            </section>
          )}
          {error && <div className="form-error" role="alert">{error}</div>}
          {stage === 'ready' && <form onSubmit={complete} aria-busy={busy}>
            <div className="field"><label htmlFor="activation-link-password">{c.password}</label><input id="activation-link-password" className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={512} disabled={busy} /></div>
            <div className="field"><label htmlFor="activation-link-confirm">{c.confirm}</label><input id="activation-link-confirm" className="input" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required maxLength={512} disabled={busy} /></div>
            <button className="btn btn--primary btn--block login-card__submit" type="submit" disabled={busy}>{busy ? c.saving : c.save}</button>
          </form>}
          {stage === 'checking' && <div className="loading-spinner" role="status" aria-label={c.checking} />}
          {stage === 'done' && <div className="activation-card__success"><button className="btn btn--primary btn--block" type="button" onClick={goToLogin}>{c.login}</button></div>}
          {(stage === 'invalid' || stage === 'ready') && <Link className="activation-card__back" href="/login">{c.back}</Link>}
        </div>
      </main>
    </div>
  );
}
