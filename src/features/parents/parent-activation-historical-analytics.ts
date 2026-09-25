import type { Locale } from '@/lib/i18n/config';
import type {
  ParentActivationHistoricalActivationStatus,
  ParentActivationHistoricalMessageStatus,
  ParentActivationHistoricalMessageSummary,
} from '@/types/parent-activation-campaign';

const COPY = {
  ar: {
    title: 'الحملات السابقة',
    description: 'راجع نتائج الحملات السابقة وحالة الرسائل والتفعيل قبل إعداد حملة جديدة.',
    loading: 'جارٍ تحميل الحملات السابقة…',
    loadError: 'تعذر تحميل الحملات السابقة.',
    analyticsError: 'تعذر تحميل تحليل هذه الحملة.',
    empty: 'لا توجد حملات سابقة بعد.',
    retry: 'إعادة المحاولة',
    refresh: 'تحديث',
    prepared: 'مُعدّة',
    createdAt: 'أُنشئت',
    preparedAt: 'أُعدّت',
    audience: 'الجمهور',
    totalAudience: 'إجمالي الجمهور',
    eligible: 'المؤهلون',
    selected: 'المختارون للإرسال',
    excluded: 'غير المؤهلين',
    eligibleNotSelected: 'مؤهلون غير مختارين',
    messageStatus: 'حالة الرسالة',
    messageScope: 'الحالات أدناه تخص المختارين للإرسال فقط.',
    activationStatus: 'حالة التفعيل',
    activationScope: 'حالة رابط التفعيل المرتبط بهذه الحملة فقط.',
    funnel: 'مسار الحملة',
    dispatchEnqueued: 'بدأ الإرسال',
    usedCampaignLink: 'استُخدم رابط الحملة',
    details: 'عرض التفاصيل',
    hideDetails: 'إخفاء التفاصيل',
    recipients: 'أولياء الأمور',
    noRecipients: 'لا توجد نتائج ضمن هذه الحالة.',
    statusAsOf: 'حالة الرسائل حتى',
    activationAsOf: 'حالة التفعيل حتى',
    messageUnavailable: 'تعذر جلب الحالة الحالية للرسائل؛ لا يتم تحويلها تلقائيًا إلى «لم يُرسل بعد».',
    deferred: 'حالة الرسائل تُجلب عند فتح الحملة فقط.',
    showing: 'عرض',
    of: 'من',
    previous: 'السابق',
    next: 'التالي',
  },
  en: {
    title: 'Previous campaigns',
    description: 'Review previous campaign outcomes, message status, and activation before preparing a new campaign.',
    loading: 'Loading previous campaigns…',
    loadError: 'Could not load previous campaigns.',
    analyticsError: 'Could not load this campaign analysis.',
    empty: 'No previous campaigns yet.',
    retry: 'Try again',
    refresh: 'Refresh',
    prepared: 'Prepared',
    createdAt: 'Created',
    preparedAt: 'Prepared',
    audience: 'Audience',
    totalAudience: 'Total audience',
    eligible: 'Eligible',
    selected: 'Selected to send',
    excluded: 'Ineligible',
    eligibleNotSelected: 'Eligible not selected',
    messageStatus: 'Message status',
    messageScope: 'The statuses below cover selected-for-dispatch recipients only.',
    activationStatus: 'Activation status',
    activationScope: 'Activation-link status for this campaign only.',
    funnel: 'Campaign flow',
    dispatchEnqueued: 'Dispatch started',
    usedCampaignLink: 'Campaign link used',
    details: 'View details',
    hideDetails: 'Hide details',
    recipients: 'Guardians',
    noRecipients: 'No recipients match this status.',
    statusAsOf: 'Message status as of',
    activationAsOf: 'Activation status as of',
    messageUnavailable: 'Current message status is unavailable; these recipients are not treated as “not sent”.',
    deferred: 'Message status is loaded only when a campaign is opened.',
    showing: 'Showing',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
  },
  fr: {
    title: 'Campagnes précédentes',
    description: 'Consultez les résultats, l’état des messages et l’activation avant de préparer une nouvelle campagne.',
    loading: 'Chargement des campagnes précédentes…',
    loadError: 'Impossible de charger les campagnes précédentes.',
    analyticsError: 'Impossible de charger l’analyse de cette campagne.',
    empty: 'Aucune campagne précédente.',
    retry: 'Réessayer',
    refresh: 'Actualiser',
    prepared: 'Préparée',
    createdAt: 'Créée',
    preparedAt: 'Préparée',
    audience: 'Audience',
    totalAudience: 'Audience totale',
    eligible: 'Éligibles',
    selected: 'Sélectionnés pour l’envoi',
    excluded: 'Non éligibles',
    eligibleNotSelected: 'Éligibles non sélectionnés',
    messageStatus: 'État du message',
    messageScope: 'Les états ci-dessous concernent uniquement les destinataires sélectionnés pour l’envoi.',
    activationStatus: 'État de l’activation',
    activationScope: 'État du lien d’activation associé uniquement à cette campagne.',
    funnel: 'Parcours de la campagne',
    dispatchEnqueued: 'Envoi démarré',
    usedCampaignLink: 'Lien de campagne utilisé',
    details: 'Voir les détails',
    hideDetails: 'Masquer les détails',
    recipients: 'Responsables',
    noRecipients: 'Aucun destinataire dans cet état.',
    statusAsOf: 'État des messages au',
    activationAsOf: 'État de l’activation au',
    messageUnavailable: 'L’état actuel des messages est indisponible ; ils ne sont pas considérés comme « non envoyés ».',
    deferred: 'L’état des messages est chargé uniquement à l’ouverture de la campagne.',
    showing: 'Affichage',
    of: 'sur',
    previous: 'Précédent',
    next: 'Suivant',
  },
  es: {
    title: 'Campañas anteriores',
    description: 'Revise los resultados, el estado de los mensajes y la activación antes de preparar una nueva campaña.',
    loading: 'Cargando campañas anteriores…',
    loadError: 'No se pudieron cargar las campañas anteriores.',
    analyticsError: 'No se pudo cargar el análisis de esta campaña.',
    empty: 'Todavía no hay campañas anteriores.',
    retry: 'Reintentar',
    refresh: 'Actualizar',
    prepared: 'Preparada',
    createdAt: 'Creada',
    preparedAt: 'Preparada',
    audience: 'Audiencia',
    totalAudience: 'Audiencia total',
    eligible: 'Elegibles',
    selected: 'Seleccionados para enviar',
    excluded: 'No elegibles',
    eligibleNotSelected: 'Elegibles no seleccionados',
    messageStatus: 'Estado del mensaje',
    messageScope: 'Los estados siguientes incluyen solo los destinatarios seleccionados para enviar.',
    activationStatus: 'Estado de activación',
    activationScope: 'Estado del enlace de activación asociado únicamente a esta campaña.',
    funnel: 'Flujo de campaña',
    dispatchEnqueued: 'Envío iniciado',
    usedCampaignLink: 'Enlace de campaña usado',
    details: 'Ver detalles',
    hideDetails: 'Ocultar detalles',
    recipients: 'Tutores',
    noRecipients: 'No hay destinatarios en este estado.',
    statusAsOf: 'Estado de mensajes a',
    activationAsOf: 'Estado de activación a',
    messageUnavailable: 'El estado actual de los mensajes no está disponible; no se consideran “no enviados”.',
    deferred: 'El estado de los mensajes se carga solo al abrir la campaña.',
    showing: 'Mostrando',
    of: 'de',
    previous: 'Anterior',
    next: 'Siguiente',
  },
} as const;

const MESSAGE_LABELS = {
  ar: {
    not_sent: 'لم يُرسل بعد', queued: 'بانتظار الإرسال', processing: 'قيد الإرسال',
    sent: 'تم الإرسال', delivered: 'تم التسليم', read: 'تمت القراءة',
    failed: 'فشل الإرسال', unavailable: 'حالة الرسالة غير متاحة',
  },
  en: {
    not_sent: 'Not sent yet', queued: 'Queued', processing: 'Sending',
    sent: 'Sent', delivered: 'Delivered', read: 'Read',
    failed: 'Failed', unavailable: 'Message status unavailable',
  },
  fr: {
    not_sent: 'Pas encore envoyé', queued: 'En attente d’envoi', processing: 'En cours d’envoi',
    sent: 'Envoyé', delivered: 'Livré', read: 'Lu',
    failed: 'Échec', unavailable: 'État du message indisponible',
  },
  es: {
    not_sent: 'Aún no enviado', queued: 'En cola', processing: 'Enviando',
    sent: 'Enviado', delivered: 'Entregado', read: 'Leído',
    failed: 'Fallido', unavailable: 'Estado del mensaje no disponible',
  },
} as const;

const ACTIVATION_LABELS = {
  ar: {
    activated_via_campaign_link: 'استُخدم رابط الحملة',
    pending_valid_link: 'رابط صالح لم يُستخدم',
    expired: 'رابط منتهي',
    revoked: 'رابط ملغى',
    not_issued: 'لم يُصدر رابط',
    unknown: 'حالة غير معروفة',
  },
  en: {
    activated_via_campaign_link: 'Campaign link used',
    pending_valid_link: 'Valid unused link',
    expired: 'Expired link',
    revoked: 'Revoked link',
    not_issued: 'No link issued',
    unknown: 'Unknown status',
  },
  fr: {
    activated_via_campaign_link: 'Lien de campagne utilisé',
    pending_valid_link: 'Lien valide non utilisé',
    expired: 'Lien expiré',
    revoked: 'Lien révoqué',
    not_issued: 'Aucun lien émis',
    unknown: 'État inconnu',
  },
  es: {
    activated_via_campaign_link: 'Enlace de campaña usado',
    pending_valid_link: 'Enlace válido sin usar',
    expired: 'Enlace caducado',
    revoked: 'Enlace revocado',
    not_issued: 'Sin enlace emitido',
    unknown: 'Estado desconocido',
  },
} as const;

export function getParentActivationHistoricalCopy(locale: Locale) {
  return COPY[locale];
}

export function getHistoricalMessageStatusLabel(locale: Locale, status: ParentActivationHistoricalMessageStatus) {
  return MESSAGE_LABELS[locale][status];
}

export function getHistoricalActivationStatusLabel(locale: Locale, status: ParentActivationHistoricalActivationStatus) {
  return ACTIVATION_LABELS[locale][status];
}

export function historicalMessageSummaryTotal(summary: ParentActivationHistoricalMessageSummary): number {
  return (
    summary.not_sent
    + summary.queued
    + summary.processing
    + summary.sent
    + summary.delivered
    + summary.read
    + summary.failed
    + summary.unavailable
  );
}

export function historicalMessageSummaryIsBalanced(summary: ParentActivationHistoricalMessageSummary): boolean {
  return historicalMessageSummaryTotal(summary) === summary.denominator;
}

export function formatHistoricalDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}
