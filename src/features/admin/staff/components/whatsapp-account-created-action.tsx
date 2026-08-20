'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/features/auth/session-context';
import { useLocale } from '@/features/i18n/locale-context';
import {
  ACCOUNT_CREATED_MESSAGING_PATH,
  buildAccountCreatedPayload,
  ensureAccountCreatedAttemptKey,
  isWhatsAppMessagingEnabled,
  resolveAccountCreatedTemplateMetadata,
  resolveActiveSchoolName,
  resolveTenantCodeForAccountCreated,
} from '@/features/admin/staff/lib/account-created-messaging';
import { api } from '@/lib/api/client';
import type { StaffMember } from '@/types/academic-setup';

type SendState = 'idle' | 'sending' | 'success' | 'error';

const COPY = {
  ar: {
    send: 'إرسال معلومات الحساب عبر WhatsApp',
    sending: 'جارٍ إرسال الطلب…',
    success: 'تم قبول طلب إرسال معلومات الحساب.',
    noPhone: 'لا يوجد رقم هاتف لهذا الحساب.',
    metadata: 'تعذر تجهيز بيانات المؤسسة اللازمة للرسالة.',
    entitlement: 'خدمة WhatsApp لم تعد متاحة. تم تحديث الصفحة للتحقق من الحالة.',
    error: 'تعذر إرسال الطلب. يمكنك إعادة المحاولة دون تكرار الرسالة.',
  },
  fr: {
    send: 'Envoyer les informations du compte par WhatsApp',
    sending: 'Envoi de la demande…',
    success: "La demande d’envoi a été acceptée.",
    noPhone: 'Aucun numéro de téléphone pour ce compte.',
    metadata: "Impossible de préparer les informations de l’établissement.",
    entitlement: "Le service WhatsApp n’est plus disponible. La page a été actualisée.",
    error: "Impossible d’envoyer la demande. Vous pouvez réessayer sans créer de doublon.",
  },
  en: {
    send: 'Send account information by WhatsApp',
    sending: 'Sending request…',
    success: 'The account-information request was accepted.',
    noPhone: 'No phone number is available for this account.',
    metadata: 'School information required for the message is unavailable.',
    entitlement: 'WhatsApp is no longer available. The page was refreshed to verify access.',
    error: 'The request could not be sent. You can retry without creating a duplicate.',
  },
  es: {
    send: 'Enviar la información de la cuenta por WhatsApp',
    sending: 'Enviando solicitud…',
    success: 'La solicitud de envío fue aceptada.',
    noPhone: 'No hay un número de teléfono disponible para esta cuenta.',
    metadata: 'No están disponibles los datos del centro necesarios para el mensaje.',
    entitlement: 'WhatsApp ya no está disponible. La página se actualizó para verificar el acceso.',
    error: 'No se pudo enviar la solicitud. Puede reintentar sin crear un duplicado.',
  },
} as const;

export function WhatsAppAccountCreatedAction({ member }: { member: StaffMember }) {
  const sessionUser = useSession();
  const { locale } = useLocale();
  const router = useRouter();
  const copy = COPY[locale];
  const enabled = isWhatsAppMessagingEnabled(sessionUser);
  const recipient = (member.mobile ?? member.phone ?? '').trim();
  const [state, setState] = useState<SendState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const attemptKeyRef = useRef<string | null>(null);

  const metadata = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const tenantCode = resolveTenantCodeForAccountCreated(window.location.hostname);
    const schoolName = resolveActiveSchoolName(sessionUser);
    return resolveAccountCreatedTemplateMetadata({
      tenantCode,
      schoolName,
    });
  }, [sessionUser]);

  if (!enabled) return null;

  const disabled = state === 'sending' || !recipient || !metadata;
  const disabledReason = !recipient ? copy.noPhone : !metadata ? copy.metadata : undefined;

  async function send() {
    if (disabled || !metadata) return;
    const idempotencyKey = ensureAccountCreatedAttemptKey(attemptKeyRef.current);
    attemptKeyRef.current = idempotencyKey;
    setState('sending');
    setMessage(null);

    const response = await api.post(ACCOUNT_CREATED_MESSAGING_PATH, buildAccountCreatedPayload({
      recipient,
      metadata,
      idempotencyKey,
    }));

    if (response.success) {
      attemptKeyRef.current = null;
      setState('success');
      setMessage(copy.success);
      return;
    }

    const status = Number(response.error?.details?.status ?? 0);
    if (response.error?.code === 'forbidden' || status === 403) {
      setState('error');
      setMessage(copy.entitlement);
      router.refresh();
      return;
    }

    // Keep the same attempt key after network/5xx/validation failures so a
    // deliberate retry cannot enqueue a duplicate if the first response was lost.
    setState('error');
    setMessage(copy.error);
  }

  return (
    <div className="col" style={{ gap: 6, alignItems: 'flex-start' }}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={send}
        disabled={disabled}
        title={disabledReason}
      >
        {state === 'sending' ? copy.sending : copy.send}
      </button>
      {message ? (
        <span className={state === 'success' ? 'tiny' : 'tiny muted'} role="status">
          {message}
        </span>
      ) : disabledReason ? (
        <span className="tiny muted">{disabledReason}</span>
      ) : null}
    </div>
  );
}
