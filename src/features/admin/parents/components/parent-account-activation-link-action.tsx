'use client';

import { useRef, useState } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import type { ParentAccountActivationLinkStatus } from '@/types/parent';
import {
  PARENT_ACCOUNT_ACTIVATION_LINK_PATH,
  buildParentActivationLinkPayload,
  canSendParentActivationLink,
  ensureParentActivationAttemptKey,
} from '../utils/parent-account-activation-link';

type SendState = 'idle' | 'sending' | 'success' | 'error';

const COPY = {
  ar: {
    send: 'إرسال رابط تفعيل الحساب عبر WhatsApp',
    sending: 'جارٍ إرسال رابط التفعيل…',
    success: 'تم قبول طلب إرسال رابط التفعيل.',
    error: 'تعذر إرسال رابط التفعيل. يمكنك إعادة المحاولة بأمان.',
    unavailable: 'حالة إرسال رابط التفعيل غير متاحة من الخادم.',
    sentBefore: 'سبق إرسال رابط التفعيل',
    neverSent: 'لم يُرسل رابط التفعيل بعد',
    loggedIn: 'سبق لولي الأمر تسجيل الدخول',
    neverLoggedIn: 'لم يسجّل ولي الأمر الدخول بعد',
    reasons: {
      no_active_relationship: 'لا توجد علاقة نشطة مؤهلة مع تلميذ في هذه المدرسة.',
      account_blocked: 'الوصول إلى الحساب محظور حسب سياسة العلاقة.',
      account_not_allowed: 'الوصول إلى الحساب غير مسموح لهذه العلاقة.',
      legal_status_unknown: 'الصفة القانونية لولي الأمر غير محسومة.',
      not_legal_guardian: 'العلاقة مسجلة كولي غير قانوني.',
      communication_not_allowed: 'التواصل غير مسموح عبر العلاقات الحالية.',
      no_user_account: 'يجب إنشاء حساب مستخدم لولي الأمر أولًا.',
      inactive_user_account: 'حساب المستخدم غير نشط.',
      identity_unavailable: 'هوية التفعيل أو بيانات الاتصال المطلوبة غير مكتملة.',
      integration_disabled: 'تكامل الإرسال غير مفعّل لهذه المؤسسة.',
      entitlement_disabled: 'خدمة WhatsApp غير مفعّلة لهذه المؤسسة.',
      activation_unavailable: 'خدمة رابط التفعيل غير متاحة حاليًا.',
    },
  },
  fr: {
    send: "Envoyer le lien d’activation par WhatsApp",
    sending: "Envoi du lien d’activation…",
    success: "La demande d’envoi du lien d’activation a été acceptée.",
    error: "Impossible d’envoyer le lien d’activation. Vous pouvez réessayer en toute sécurité.",
    unavailable: "L’état d’envoi du lien d’activation n’est pas disponible côté serveur.",
    sentBefore: "Un lien d’activation a déjà été envoyé",
    neverSent: "Aucun lien d’activation n’a encore été envoyé",
    loggedIn: "Le responsable s’est déjà connecté",
    neverLoggedIn: "Le responsable ne s’est pas encore connecté",
    reasons: {
      no_active_relationship: "Aucune relation active éligible dans cet établissement.",
      account_blocked: "L’accès au compte est bloqué par la politique de la relation.",
      account_not_allowed: "L’accès au compte n’est pas autorisé pour cette relation.",
      legal_status_unknown: "Le statut légal du responsable n’est pas déterminé.",
      not_legal_guardian: "La relation indique que ce responsable n’est pas un tuteur légal.",
      communication_not_allowed: "La communication n’est pas autorisée par les relations actuelles.",
      no_user_account: "Créez d’abord un compte utilisateur pour ce responsable.",
      inactive_user_account: "Le compte utilisateur est inactif.",
      identity_unavailable: "L’identité d’activation ou les coordonnées requises sont incomplètes.",
      integration_disabled: "L’intégration d’envoi est désactivée pour cet établissement.",
      entitlement_disabled: "Le service WhatsApp est désactivé pour cet établissement.",
      activation_unavailable: "Le service de lien d’activation est actuellement indisponible.",
    },
  },
  en: {
    send: 'Send account activation link by WhatsApp',
    sending: 'Sending activation link…',
    success: 'The activation-link request was accepted.',
    error: 'The activation link could not be sent. You can safely retry.',
    unavailable: 'Activation-link send status is unavailable from the server.',
    sentBefore: 'An activation link was sent before',
    neverSent: 'No activation link has been sent yet',
    loggedIn: 'The guardian has signed in before',
    neverLoggedIn: 'The guardian has not signed in yet',
    reasons: {
      no_active_relationship: 'There is no eligible active relationship in this school.',
      account_blocked: 'Account access is blocked by the relationship policy.',
      account_not_allowed: 'Account access is not allowed for this relationship.',
      legal_status_unknown: 'The guardian legal status is unresolved.',
      not_legal_guardian: 'The relationship marks this person as not a legal guardian.',
      communication_not_allowed: 'Communication is not allowed by the current relationships.',
      no_user_account: 'Create a user account for this guardian first.',
      inactive_user_account: 'The user account is inactive.',
      identity_unavailable: 'Required activation identity or contact data is incomplete.',
      integration_disabled: 'The messaging integration is disabled for this school.',
      entitlement_disabled: 'WhatsApp is disabled for this school.',
      activation_unavailable: 'The activation-link service is currently unavailable.',
    },
  },
  es: {
    send: 'Enviar enlace de activación por WhatsApp',
    sending: 'Enviando enlace de activación…',
    success: 'La solicitud de envío del enlace de activación fue aceptada.',
    error: 'No se pudo enviar el enlace de activación. Puede reintentarlo de forma segura.',
    unavailable: 'El estado de envío del enlace de activación no está disponible en el servidor.',
    sentBefore: 'Ya se envió un enlace de activación',
    neverSent: 'Aún no se ha enviado ningún enlace de activación',
    loggedIn: 'El tutor ya ha iniciado sesión',
    neverLoggedIn: 'El tutor aún no ha iniciado sesión',
    reasons: {
      no_active_relationship: 'No hay una relación activa elegible en este centro.',
      account_blocked: 'El acceso a la cuenta está bloqueado por la política de la relación.',
      account_not_allowed: 'El acceso a la cuenta no está permitido para esta relación.',
      legal_status_unknown: 'El estado legal del tutor no está determinado.',
      not_legal_guardian: 'La relación indica que esta persona no es tutor legal.',
      communication_not_allowed: 'La comunicación no está permitida por las relaciones actuales.',
      no_user_account: 'Primero debe crear una cuenta de usuario para este tutor.',
      inactive_user_account: 'La cuenta de usuario está inactiva.',
      identity_unavailable: 'Faltan datos de identidad o contacto necesarios para la activación.',
      integration_disabled: 'La integración de mensajería está desactivada para este centro.',
      entitlement_disabled: 'WhatsApp está desactivado para este centro.',
      activation_unavailable: 'El servicio de enlace de activación no está disponible actualmente.',
    },
  },
} as const;

type SupportedLocale = keyof typeof COPY;

function blockerText(
  locale: SupportedLocale,
  status: ParentAccountActivationLinkStatus | null | undefined,
): string | null {
  if (canSendParentActivationLink(status)) return null;
  const copy = COPY[locale];
  const reason = status?.blocking_reason;
  if (!reason) return copy.unavailable;
  const reasons = copy.reasons as Record<string, string>;
  return reasons[reason] ?? copy.unavailable;
}

export function ParentAccountActivationLinkAction({
  parentId,
  status,
  onSent,
}: {
  parentId: number;
  status: ParentAccountActivationLinkStatus | null | undefined;
  onSent?: () => void;
}) {
  const { locale } = useLocale();
  const copy = COPY[locale];
  const [state, setState] = useState<SendState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const attemptKeyRef = useRef<string | null>(null);
  const allowed = canSendParentActivationLink(status);
  const blockedMessage = blockerText(locale, status);
  const hasHistoryContract =
    typeof status?.sent_before === 'boolean' || typeof status?.has_logged_in === 'boolean';
  const disabled = state === 'sending' || !allowed;

  async function send() {
    if (disabled) return;
    const idempotencyKey = ensureParentActivationAttemptKey(attemptKeyRef.current);
    attemptKeyRef.current = idempotencyKey;
    setState('sending');
    setMessage(null);

    const response = await api.post(
      PARENT_ACCOUNT_ACTIVATION_LINK_PATH,
      buildParentActivationLinkPayload({ parentId, idempotencyKey }),
    );

    if (response.success) {
      attemptKeyRef.current = null;
      setState('success');
      setMessage(copy.success);
      onSent?.();
      return;
    }

    setState('error');
    setMessage(copy.error);
  }

  return (
    <div className="parent-profile__activation-link-action">
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={send}
        disabled={disabled}
      >
        {state === 'sending' ? copy.sending : copy.send}
      </button>

      {blockedMessage ? (
        <p className="tiny muted" role="status">
          {blockedMessage}
        </p>
      ) : null}

      {hasHistoryContract ? (
        <div className="parent-profile__activation-link-history tiny muted">
          <span>
            {status.sent_before === true ? copy.sentBefore : copy.neverSent}
            {status.last_sent_at ? (
              <> · <span dir="ltr">{status.last_sent_at}</span></>
            ) : null}
          </span>
          <span>
            {status.has_logged_in === true ? copy.loggedIn : copy.neverLoggedIn}
            {status.last_login_at ? (
              <> · <span dir="ltr">{status.last_login_at}</span></>
            ) : null}
          </span>
        </div>
      ) : null}

      {message ? (
        <span className={state === 'success' ? 'tiny' : 'tiny muted'} role="status">
          {message}
        </span>
      ) : null}
    </div>
  );
}
