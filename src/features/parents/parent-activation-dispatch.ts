import type { Locale } from '@/lib/i18n/config';
import type {
  ParentActivationCampaignDispatch,
  ParentActivationDispatchResultRow,
} from '@/types/parent-activation-campaign';

export type ParentActivationRecipientFilter = 'all' | 'ready' | 'excluded';
export type ParentActivationDispatchTone = 'green' | 'red' | 'amber' | 'blue' | 'slate';

type DispatchCopyBase = {
  previewSafetyTitle: string;
  previewSafetyDescription: string;
  reviewTitle: string;
  reviewDescription: string;
  readyEmphasis: string;
  allRecipients: string;
  readyRecipients: string;
  excludedRecipients: string;
  dispatchStepTitle: string;
  dispatchStepDescription: string;
  noReadyTitle: string;
  noReadyDescription: string;
  sendButton: string;
  sending: string;
  confirmTitle: string;
  confirmDescription: string;
  confirmExcluded: string;
  confirmRevalidation: string;
  confirmSend: string;
  retryTitle: string;
  retryDescription: string;
  retryButton: string;
  resultTitle: string;
  resultComplete: string;
  resultPartial: string;
  resultFailed: string;
  resultUnknown: string;
  queued: string;
  alreadyProcessed: string;
  notSent: string;
  failed: string;
  unknownStatus: string;
  resultDetails: string;
  dispatchRequestFailed: string;
  genericRecipientFailure: string;
  integrationDisabled: string;
  messagingUnavailable: string;
  idempotencyConflict: string;
  activationUnavailable: string;
};

export type ParentActivationDispatchCopy = DispatchCopyBase & {
  sendButtonFor: (count: number) => string;
  confirmDescriptionFor: (count: number) => string;
  confirmExcludedFor: (count: number) => string;
  retryDescriptionFor: (count: number) => string;
};

const COPY: Record<Locale, DispatchCopyBase> = {
  ar: {
    previewSafetyTitle: 'ابدأ بالمعاينة',
    previewSafetyDescription: 'تجهيز المعاينة يراجع الأهلية فقط ولا يرسل WhatsApp أو ينشئ رابط تفعيل.',
    reviewTitle: '2. مراجعة المستلمين',
    reviewDescription: 'راجع الجاهزين والمستبعدين قبل اعتماد الإرسال.',
    readyEmphasis: 'جاهزون للإرسال',
    allRecipients: 'الكل',
    readyRecipients: 'الجاهزون',
    excludedRecipients: 'المستبعدون',
    dispatchStepTitle: '3. إرسال روابط التفعيل',
    dispatchStepDescription: 'عند التأكيد سيعيد رقيم التحقق من الأهلية ثم يضع روابط التفعيل المؤهلة في مسار WhatsApp المعتمد.',
    noReadyTitle: 'لا يوجد مستلم جاهز الآن',
    noReadyDescription: 'صحّح أسباب الاستبعاد ثم جهّز معاينة جديدة قبل الإرسال.',
    sendButton: 'إرسال رابط التفعيل إلى {count} وليًا',
    sending: 'جارٍ تنفيذ الإرسال…',
    confirmTitle: 'تأكيد إرسال روابط التفعيل',
    confirmDescription: 'سيحاول رقيم إرسال رابط التفعيل إلى {count} وليًا جاهزًا.',
    confirmExcluded: '{count} وليًا مستبعدًا لن تصلهم رسالة من هذه المعاينة.',
    confirmRevalidation: 'سيُعاد التحقق من أهلية كل مستلم في Odoo لحظة الإرسال قبل إنشاء الرابط.',
    confirmSend: 'تأكيد الإرسال',
    retryTitle: 'إعادة محاولة الإرسال',
    retryDescription: 'هناك {count} محاولة متعذرة. لن يُعاد إرسال من سبق نجاحه، وسيعيد Odoo التحقق من بقية المستلمين.',
    retryButton: 'إعادة محاولة الإرسال',
    resultTitle: 'نتيجة الإرسال',
    resultComplete: 'اكتملت العملية دون محاولات متعذرة.',
    resultPartial: 'اكتملت العملية جزئيًا. بعض المستلمين يحتاجون إعادة محاولة أو مراجعة.',
    resultFailed: 'تعذر تنفيذ الإرسال للمستلمين الجاهزين. يمكنك إعادة المحاولة بعد التحقق من الخدمة.',
    resultUnknown: 'وردت حالة غير معروفة من الخادم. لم نعرض القيمة التقنية؛ راجع العملية قبل إعادة المحاولة.',
    queued: 'أضيفت للإرسال',
    alreadyProcessed: 'سبق تنفيذها',
    notSent: 'لم تُرسل',
    failed: 'متعذرة',
    unknownStatus: 'حالة غير معروفة',
    resultDetails: 'تفاصيل المستلمين',
    dispatchRequestFailed: 'تعذر تنفيذ طلب الإرسال. لم تُرسل الواجهة أي قائمة مستلمين؛ يمكنك إعادة المحاولة بعد التحقق من الخدمة.',
    genericRecipientFailure: 'تعذر تجهيز أو تسليم رابط التفعيل لهذا الولي.',
    integrationDisabled: 'خدمة الإرسال غير مفعلة لهذه المؤسسة.',
    messagingUnavailable: 'تعذر الوصول إلى خدمة الرسائل أو قبول طلب الإرسال.',
    idempotencyConflict: 'تعذر تأكيد حالة محاولة سابقة بأمان.',
    activationUnavailable: 'تعذر تجهيز رابط التفعيل لهذا الولي.',
  },
  en: {
    previewSafetyTitle: 'Start with the preview',
    previewSafetyDescription: 'Preparing the preview only checks eligibility. It does not send WhatsApp or create an activation link.',
    reviewTitle: '2. Review recipients',
    reviewDescription: 'Review ready and excluded recipients before authorizing dispatch.',
    readyEmphasis: 'Ready to send',
    allRecipients: 'All',
    readyRecipients: 'Ready',
    excludedRecipients: 'Excluded',
    dispatchStepTitle: '3. Send activation links',
    dispatchStepDescription: 'After confirmation, Raqeem rechecks eligibility and queues eligible activation links through the governed WhatsApp flow.',
    noReadyTitle: 'No recipient is ready yet',
    noReadyDescription: 'Resolve the exclusion reasons and prepare a new preview before sending.',
    sendButton: 'Send activation link to {count} guardians',
    sending: 'Sending…',
    confirmTitle: 'Confirm activation-link dispatch',
    confirmDescription: 'Raqeem will attempt to send an activation link to {count} ready guardians.',
    confirmExcluded: '{count} excluded guardians will not receive a message from this preview.',
    confirmRevalidation: 'Odoo rechecks every recipient at dispatch time before creating a link.',
    confirmSend: 'Confirm send',
    retryTitle: 'Retry dispatch',
    retryDescription: '{count} attempts failed. Previously successful recipients will not be sent again, and Odoo will recheck the remaining recipients.',
    retryButton: 'Retry dispatch',
    resultTitle: 'Dispatch result',
    resultComplete: 'The operation completed without failed attempts.',
    resultPartial: 'The operation completed partially. Some recipients need a retry or review.',
    resultFailed: 'Dispatch failed for the ready recipients. You can retry after checking the service.',
    resultUnknown: 'The server returned an unknown state. The technical value is hidden; review the operation before retrying.',
    queued: 'Queued',
    alreadyProcessed: 'Already processed',
    notSent: 'Not sent',
    failed: 'Failed',
    unknownStatus: 'Unknown state',
    resultDetails: 'Recipient details',
    dispatchRequestFailed: 'The dispatch request could not be completed. The UI did not send a recipient list; retry after checking the service.',
    genericRecipientFailure: 'The activation link could not be prepared or handed to messaging for this guardian.',
    integrationDisabled: 'Messaging is not enabled for this school.',
    messagingUnavailable: 'The messaging service could not be reached or did not accept the request.',
    idempotencyConflict: 'A previous attempt could not be reconciled safely.',
    activationUnavailable: 'The activation link could not be prepared for this guardian.',
  },
  fr: {
    previewSafetyTitle: 'Commencer par l’aperçu',
    previewSafetyDescription: 'La préparation vérifie uniquement l’éligibilité. Elle n’envoie aucun WhatsApp et ne crée aucun lien d’activation.',
    reviewTitle: '2. Vérifier les destinataires',
    reviewDescription: 'Vérifiez les destinataires prêts et exclus avant d’autoriser l’envoi.',
    readyEmphasis: 'Prêts à envoyer',
    allRecipients: 'Tous',
    readyRecipients: 'Prêts',
    excludedRecipients: 'Exclus',
    dispatchStepTitle: '3. Envoyer les liens d’activation',
    dispatchStepDescription: 'Après confirmation, Raqeem revérifie l’éligibilité puis met en file les liens autorisés via le flux WhatsApp gouverné.',
    noReadyTitle: 'Aucun destinataire n’est prêt',
    noReadyDescription: 'Corrigez les motifs d’exclusion puis préparez un nouvel aperçu avant l’envoi.',
    sendButton: 'Envoyer le lien d’activation à {count} responsables',
    sending: 'Envoi en cours…',
    confirmTitle: 'Confirmer l’envoi des liens',
    confirmDescription: 'Raqeem tentera d’envoyer un lien d’activation à {count} responsables prêts.',
    confirmExcluded: '{count} responsables exclus ne recevront aucun message depuis cet aperçu.',
    confirmRevalidation: 'Odoo revérifie chaque destinataire au moment de l’envoi avant de créer le lien.',
    confirmSend: 'Confirmer l’envoi',
    retryTitle: 'Réessayer l’envoi',
    retryDescription: '{count} tentatives ont échoué. Les envois déjà réussis ne seront pas répétés et Odoo revérifiera les autres destinataires.',
    retryButton: 'Réessayer l’envoi',
    resultTitle: 'Résultat de l’envoi',
    resultComplete: 'L’opération est terminée sans tentative échouée.',
    resultPartial: 'L’opération est partiellement terminée. Certains destinataires nécessitent une nouvelle tentative ou une vérification.',
    resultFailed: 'L’envoi a échoué pour les destinataires prêts. Vous pouvez réessayer après vérification du service.',
    resultUnknown: 'Le serveur a renvoyé un état inconnu. La valeur technique est masquée ; vérifiez l’opération avant de réessayer.',
    queued: 'Mis en file',
    alreadyProcessed: 'Déjà traité',
    notSent: 'Non envoyé',
    failed: 'Échec',
    unknownStatus: 'État inconnu',
    resultDetails: 'Détails des destinataires',
    dispatchRequestFailed: 'La demande d’envoi n’a pas abouti. L’interface n’a transmis aucune liste de destinataires ; réessayez après vérification du service.',
    genericRecipientFailure: 'Le lien d’activation n’a pas pu être préparé ou transmis au service de messagerie.',
    integrationDisabled: 'Le service de messagerie n’est pas activé pour cet établissement.',
    messagingUnavailable: 'Le service de messagerie est indisponible ou n’a pas accepté la demande.',
    idempotencyConflict: 'Une tentative précédente n’a pas pu être réconciliée de façon sûre.',
    activationUnavailable: 'Le lien d’activation n’a pas pu être préparé pour ce responsable.',
  },
  es: {
    previewSafetyTitle: 'Empieza con la vista previa',
    previewSafetyDescription: 'Preparar la vista previa solo comprueba la elegibilidad. No envía WhatsApp ni crea enlaces de activación.',
    reviewTitle: '2. Revisar destinatarios',
    reviewDescription: 'Revisa los destinatarios listos y excluidos antes de autorizar el envío.',
    readyEmphasis: 'Listos para enviar',
    allRecipients: 'Todos',
    readyRecipients: 'Listos',
    excludedRecipients: 'Excluidos',
    dispatchStepTitle: '3. Enviar enlaces de activación',
    dispatchStepDescription: 'Tras confirmar, Raqeem vuelve a comprobar la elegibilidad y pone en cola los enlaces permitidos mediante el flujo gobernado de WhatsApp.',
    noReadyTitle: 'No hay destinatarios listos',
    noReadyDescription: 'Corrige los motivos de exclusión y prepara una nueva vista previa antes de enviar.',
    sendButton: 'Enviar enlace de activación a {count} tutores',
    sending: 'Enviando…',
    confirmTitle: 'Confirmar envío de enlaces',
    confirmDescription: 'Raqeem intentará enviar un enlace de activación a {count} tutores listos.',
    confirmExcluded: '{count} tutores excluidos no recibirán ningún mensaje de esta vista previa.',
    confirmRevalidation: 'Odoo vuelve a comprobar cada destinatario en el momento del envío antes de crear el enlace.',
    confirmSend: 'Confirmar envío',
    retryTitle: 'Reintentar envío',
    retryDescription: 'Fallaron {count} intentos. No se repetirá el envío a quienes ya tuvieron éxito y Odoo volverá a comprobar los demás destinatarios.',
    retryButton: 'Reintentar envío',
    resultTitle: 'Resultado del envío',
    resultComplete: 'La operación terminó sin intentos fallidos.',
    resultPartial: 'La operación terminó parcialmente. Algunos destinatarios necesitan un reintento o revisión.',
    resultFailed: 'El envío falló para los destinatarios listos. Puedes reintentar tras comprobar el servicio.',
    resultUnknown: 'El servidor devolvió un estado desconocido. Se oculta el valor técnico; revisa la operación antes de reintentar.',
    queued: 'En cola',
    alreadyProcessed: 'Ya procesado',
    notSent: 'No enviado',
    failed: 'Fallido',
    unknownStatus: 'Estado desconocido',
    resultDetails: 'Detalles de destinatarios',
    dispatchRequestFailed: 'No se pudo completar la solicitud de envío. La interfaz no transmitió ninguna lista de destinatarios; reintenta tras comprobar el servicio.',
    genericRecipientFailure: 'No se pudo preparar o entregar el enlace de activación al servicio de mensajería.',
    integrationDisabled: 'El servicio de mensajería no está habilitado para este centro.',
    messagingUnavailable: 'No se pudo contactar con el servicio de mensajería o este no aceptó la solicitud.',
    idempotencyConflict: 'No se pudo conciliar de forma segura un intento anterior.',
    activationUnavailable: 'No se pudo preparar el enlace de activación para este tutor.',
  },
};

function withCount(template: string, count: number): string {
  return template.replace('{count}', String(count));
}

export function getParentActivationDispatchCopy(locale: Locale): ParentActivationDispatchCopy {
  const base = COPY[locale];
  return {
    ...base,
    sendButtonFor: (count) => withCount(base.sendButton, count),
    confirmDescriptionFor: (count) => withCount(base.confirmDescription, count),
    confirmExcludedFor: (count) => withCount(base.confirmExcluded, count),
    retryDescriptionFor: (count) => withCount(base.retryDescription, count),
  };
}

export function buildParentActivationDispatchBody(): Record<string, never> {
  return {};
}

export function canStartParentActivationDispatch(readyCount: number, busy: boolean): boolean {
  return Number.isFinite(readyCount) && readyCount > 0 && !busy;
}

export function summarizeParentActivationDispatch(result: ParentActivationCampaignDispatch) {
  const summary = {
    total: result.results.length,
    queued: 0,
    alreadyProcessed: 0,
    excluded: 0,
    failed: 0,
    unknown: 0,
  };

  for (const row of result.results) {
    if (row.status === 'queued') summary.queued += 1;
    else if (row.status === 'already_processed') summary.alreadyProcessed += 1;
    else if (row.status === 'excluded') summary.excluded += 1;
    else if (row.status === 'failed') summary.failed += 1;
    else summary.unknown += 1;
  }

  return summary;
}

export function getParentActivationDispatchStatusMeta(
  locale: Locale,
  status: string,
): { label: string; tone: ParentActivationDispatchTone } {
  const copy = getParentActivationDispatchCopy(locale);
  if (status === 'queued') return { label: copy.queued, tone: 'green' };
  if (status === 'already_processed') return { label: copy.alreadyProcessed, tone: 'blue' };
  if (status === 'excluded') return { label: copy.notSent, tone: 'amber' };
  if (status === 'failed') return { label: copy.failed, tone: 'red' };
  return { label: copy.unknownStatus, tone: 'slate' };
}

export function getParentActivationDispatchFailureLabel(
  locale: Locale,
  errorCode: string | null,
): string {
  const copy = getParentActivationDispatchCopy(locale);
  if (!errorCode) return copy.genericRecipientFailure;

  if (errorCode === 'integration_disabled' || errorCode === 'entitlement_disabled') {
    return copy.integrationDisabled;
  }
  if (errorCode === 'messaging_rejected' || errorCode === 'activation_unavailable' || errorCode === 'unavailable_error') {
    return copy.messagingUnavailable;
  }
  if (errorCode === 'idempotency_conflict') return copy.idempotencyConflict;
  if (errorCode === 'activation_failed') return copy.activationUnavailable;
  return copy.genericRecipientFailure;
}

export function parentActivationDispatchResultHasSensitiveFields(
  row: ParentActivationDispatchResultRow,
): boolean {
  const forbidden = new Set(['phone', 'mobile', 'login', 'token', 'activation_token', 'activation_url', 'url']);
  return Object.keys(row as unknown as Record<string, unknown>).some((key) => forbidden.has(key));
}
