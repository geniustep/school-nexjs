'use client';

export type AuthenticationActivityListBlock = {
  activity_state: 'authenticated' | 'never_authenticated' | 'no_account';
  last_authenticated_at: string | null;
  activity_confidence: 'authentication_only' | null;
};

export function authenticationActivityText(
  value: AuthenticationActivityListBlock | null | undefined,
  locale: string,
): { state: string; last: string } {
  const fr = locale === 'fr';
  const en = locale === 'en';
  const fallback = fr ? 'Indisponible' : en ? 'Unavailable' : 'غير متوفر';
  if (!value || !['authenticated', 'never_authenticated', 'no_account'].includes(value.activity_state)) {
    return { state: fallback, last: '—' };
  }
  if (value.activity_state === 'no_account') {
    return { state: fr ? 'Sans compte' : en ? 'No account' : 'دون حساب', last: '—' };
  }
  if (value.activity_state === 'never_authenticated') {
    return { state: fr ? 'Jamais connecté' : en ? 'Never signed in' : 'لم يسجل الدخول بعد', last: '—' };
  }
  const raw = value.last_authenticated_at;
  if (!raw || value.activity_confidence !== 'authentication_only') {
    return { state: fallback, last: '—' };
  }
  // Odoo UTC datetime strings are generally space-separated and timezone-naive.
  const iso = /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(raw) ? raw.replace(' ', 'T') + 'Z' : raw;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { state: fallback, last: '—' };
  return {
    state: fr ? 'Connexion confirmée' : en ? 'Signed in' : 'سجّل الدخول',
    last: new Intl.DateTimeFormat(fr ? 'fr-FR' : en ? 'en-GB' : 'ar-MA', { dateStyle: 'medium', timeStyle: 'short' }).format(date),
  };
}

export function AuthenticationActivity({
  value,
  locale,
}: {
  value?: AuthenticationActivityListBlock | null;
  locale: string;
}) {
  const display = authenticationActivityText(value, locale);
  return (
    <span className="tiny" title={locale === 'fr' ? 'Dernière authentification, pas la dernière activité dans l’application' : locale === 'en' ? 'Last successful sign-in, not last app use' : 'آخر تسجيل دخول ناجح، وليس آخر استعمال للتطبيق'}>
      <span>{display.state}</span>
      {display.last !== '—' ? <span className="muted" style={{ display: 'block' }}>{display.last}</span> : null}
    </span>
  );
}
