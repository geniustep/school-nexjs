'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { api } from '@/lib/api/client';
import type { StaffMember } from '@/types/academic-setup';
import {
  ACCOUNT_ACTIVATION_LINK_MESSAGING_PATH,
  activationLinkBlockers,
  buildAccountActivationLinkPayload,
  ensureAccountActivationAttemptKey,
  isWhatsAppMessagingEnabled,
  type AccountActivationLinkBlocker,
} from '@/features/admin/staff/lib/account-activation-link-messaging';

type SendState = 'idle' | 'sending' | 'success' | 'error';
const COPY = {
  ar: {
    send: 'إرسال رابط تفعيل الحساب عبر WhatsApp', sending: 'جارٍ إرسال الرابط…', success: 'تم قبول طلب إرسال رابط التفعيل.',
    error: 'تعذر إرسال الطلب. يمكنك إعادة المحاولة دون تكرار الرسالة.',
    whatsapp_unavailable: 'خدمة WhatsApp غير مفعّلة لهذه المؤسسة.', staff_inactive: 'حساب الموظف غير نشط.',
    phone_missing: 'رقم هاتف الموظف غير مكتمل.', name_ar_missing: 'الاسم الكامل بالعربية غير مكتمل.',
    name_fr_missing: 'الاسم الكامل بالفرنسية غير مكتمل.', language_missing: 'لغة إشعار التفعيل غير محددة (العربية أو الفرنسية).',
  },
  fr: {
    send: 'Envoyer le lien d’activation par WhatsApp', sending: 'Envoi du lien…', success: "La demande d’envoi du lien d’activation a été acceptée.",
    error: "Impossible d’envoyer la demande. Vous pouvez réessayer sans créer de doublon.",
    whatsapp_unavailable: 'Le service WhatsApp est désactivé pour cet établissement.', staff_inactive: 'Le compte du personnel est inactif.',
    phone_missing: 'Le numéro de téléphone du personnel est incomplet.', name_ar_missing: 'Le nom complet en arabe est incomplet.',
    name_fr_missing: 'Le nom complet en français est incomplet.', language_missing: "La langue de notification d’activation doit être l’arabe ou le français.",
  },
  en: {
    send: 'Send account activation link by WhatsApp', sending: 'Sending link…', success: 'The activation-link request was accepted.',
    error: 'The request could not be sent. You can retry without creating a duplicate.',
    whatsapp_unavailable: 'WhatsApp is disabled for this school.', staff_inactive: 'The staff account is inactive.',
    phone_missing: 'The staff phone number is incomplete.', name_ar_missing: 'The Arabic full name is incomplete.',
    name_fr_missing: 'The French full name is incomplete.', language_missing: 'Activation notification language must be Arabic or French.',
  },
  es: {
    send: 'Enviar enlace de activación por WhatsApp', sending: 'Enviando enlace…', success: 'La solicitud de enlace de activación fue aceptada.',
    error: 'No se pudo enviar la solicitud. Puede reintentar sin crear un duplicado.',
    whatsapp_unavailable: 'WhatsApp está desactivado para este centro.', staff_inactive: 'La cuenta del personal está inactiva.',
    phone_missing: 'El teléfono del personal está incompleto.', name_ar_missing: 'El nombre completo en árabe está incompleto.',
    name_fr_missing: 'El nombre completo en francés está incompleto.', language_missing: 'El idioma de activación debe ser árabe o francés.',
  },
} as const;

export function WhatsAppAccountActivationLinkAction({ member }: { member: StaffMember }) {
  const { locale } = useLocale();
  const sessionUser = useSession();
  const router = useRouter();
  const copy = COPY[locale];
  const [state, setState] = useState<SendState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const attemptKeyRef = useRef<string | null>(null);
  const blockers = activationLinkBlockers(member, isWhatsAppMessagingEnabled(sessionUser));
  const disabled = state === 'sending' || blockers.length > 0;

  async function send() {
    if (disabled) return;
    const idempotencyKey = ensureAccountActivationAttemptKey(attemptKeyRef.current);
    attemptKeyRef.current = idempotencyKey;
    setState('sending');
    setMessage(null);
    const response = await api.post(
      ACCOUNT_ACTIVATION_LINK_MESSAGING_PATH,
      buildAccountActivationLinkPayload({ staffId: member.id, idempotencyKey }),
    );
    if (response.success) {
      attemptKeyRef.current = null;
      setState('success');
      setMessage(copy.success);
      return;
    }
    setState('error');
    setMessage(copy.error);
    if (response.error?.code === 'forbidden' || Number(response.error?.details?.status) === 403) router.refresh();
  }

  return (
    <div className="col" style={{ gap: 6, alignItems: 'flex-start' }}>
      <button type="button" className="btn btn--ghost btn--sm" onClick={send} disabled={disabled}>
        {state === 'sending' ? copy.sending : copy.send}
      </button>
      {blockers.length ? (
        <ul className="tiny muted" role="alert" style={{ margin: 0, paddingInlineStart: 18 }}>
          {blockers.map((blocker: AccountActivationLinkBlocker) => <li key={blocker}>{copy[blocker]}</li>)}
        </ul>
      ) : null}
      {message ? <span className={state === 'success' ? 'tiny' : 'tiny muted'} role="status">{message}</span> : null}
    </div>
  );
}
