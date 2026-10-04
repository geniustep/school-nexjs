'use client';

import Link from 'next/link';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { LoginAmbientBackground } from '@/features/auth/login-branded-background';
import { LoginBrandPanel } from '@/features/auth/login-brand-panel';
import { useLocale } from '@/features/i18n/locale-context';
import { loginBrandingStyle, loginPageBranded } from '@/lib/public-school-branding/client';
import type { LoginSchoolBrandingView } from '@/types/public-school-branding';
import { AccountActivationLinkForm } from './account-activation-link-form';

const COPY = {
  ar: {
    title: 'رابط التفعيل مطلوب',
    intro: 'هذه الصفحة مخصصة لتفعيل الحساب من الرابط الشخصي الذي أرسلته المؤسسة. افتح رابط التفعيل الكامل لإكمال العملية.',
    note: 'إذا كان حسابك مفعّلًا بالفعل، يمكنك تسجيل الدخول برقم هاتفك وكلمة المرور.',
    login: 'الانتقال إلى تسجيل الدخول',
  },
  fr: {
    title: "Lien d’activation requis",
    intro: "Cette page est réservée à l’activation via le lien personnel envoyé par l’établissement. Ouvrez le lien d’activation complet pour continuer.",
    note: "Si votre compte est déjà activé, connectez-vous avec votre numéro de téléphone et votre mot de passe.",
    login: 'Se connecter',
  },
  en: {
    title: 'Activation link required',
    intro: 'This page is reserved for account activation through the personal link sent by the institution. Open the complete activation link to continue.',
    note: 'If your account is already active, sign in with your phone number and password.',
    login: 'Go to sign in',
  },
  es: {
    title: 'Se requiere el enlace de activación',
    intro: 'Esta página está reservada para activar la cuenta mediante el enlace personal enviado por el centro. Abre el enlace de activación completo para continuar.',
    note: 'Si tu cuenta ya está activada, inicia sesión con tu número de teléfono y contraseña.',
    login: 'Iniciar sesión',
  },
} as const;

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function getHash() {
  return window.location.hash;
}

function getServerHash() {
  return '';
}

export function AccountActivationEntry({ branding }: { branding: LoginSchoolBrandingView }) {
  const hash = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  const captured = useRef<{ requested: boolean; token: string } | null>(null);

  if (captured.current === null && hash.startsWith('#token=')) {
    captured.current = { requested: true, token: hash.slice('#token='.length) };
  }

  const linkRequest = captured.current;

  useEffect(() => {
    if (!linkRequest?.requested || window.location.hash === '') return;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, [linkRequest]);

  if (linkRequest?.requested) {
    return <AccountActivationLinkForm branding={branding} token={linkRequest.token} />;
  }

  return <ActivationLinkRequired branding={branding} />;
}

function ActivationLinkRequired({ branding }: { branding: LoginSchoolBrandingView }) {
  const { locale } = useLocale();
  const c = COPY[locale];
  const branded = loginPageBranded(branding);

  return (
    <div
      className="login-page"
      data-branded={branded ? 'true' : undefined}
      style={loginBrandingStyle(branding)}
    >
      <LoginAmbientBackground />
      <div className="login-page__locale"><LocaleSwitcher variant="login" /></div>
      <main className="login-page__shell">
        <LoginBrandPanel
          branding={branding}
          schoolName={branding.schoolName ?? 'Raqeem'}
          tagline={branding.welcomeSubtitle}
          yearLabel={branding.academicYearLabel}
        />
        <div className="login-card activation-card">
          <div className="login-card__mark">
            <BrandLogo variant="full" className="login-card__raqeem-logo" />
          </div>
          <h1 className="login-card__title">{c.title}</h1>
          <p className="login-card__sub">{c.intro}</p>
          <div className="activation-card__success">
            <p>{c.note}</p>
            <Link className="btn btn--primary btn--block" href="/login">{c.login}</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
