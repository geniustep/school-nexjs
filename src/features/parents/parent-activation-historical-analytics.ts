import type { Locale } from '@/lib/i18n/config';
import type {
  ParentActivationHistoricalActivationStatus,
  ParentActivationHistoricalMessageStatus,
  ParentActivationCampaignArchiveStatus,
  ParentActivationHistoricalCampaignListItem,
  ParentActivationHistoricalMessageSummary,
  ParentActivationHistoricalMilestone,
  ParentActivationHistoricalMilestoneSummary,
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
    savedCampaign: 'محفوظة',
    sentCampaign: 'مرسلة',
    saveCampaign: 'حفظ الحملة',
    savingCampaign: 'جارٍ الحفظ…',
    campaignSavedNotice: 'تم حفظ الحملة وستظهر ضمن الحملات السابقة.',
    saveCampaignFailed: 'تعذر حفظ الحملة.',
    previewCampaign: 'معاينة غير محفوظة',
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
    selectCampaign: 'اختر حملة',
    campaignOverview: 'ملخص الحملة',
    campaignPerformance: 'مسار وصول الرسالة',
    cumulativeHint: 'هذه المراحل تراكمية: من قرأ الرسالة يُحتسب أيضًا ضمن من تم التسليم إليهم ومن أُرسلت لهم.',
    sentTo: 'أُرسلت لهم',
    deliveredTo: 'تم التسليم إليهم',
    readBy: 'قرأوا الرسالة',
    openedLink: 'فتحوا رابط التفعيل',
    recipientResults: 'أولياء الأمور في هذه المرحلة',
    currentMessageState: 'الحالة الحالية',
    milestoneReachedAt: 'وقت الوصول للمرحلة',
    selectedAudience: 'المختارون في الحملة',
    rateOfSelected: 'من المختارين',
    failedNow: 'فشل الإرسال حاليًا',
    notSentYet: 'لم يُرسل بعد',
    technicalStates: 'الحالات الحالية والتشخيص',
    milestoneUnavailable: 'بعض حالات Messaging غير متاحة حاليًا؛ لا نعتبرها تلقائيًا غير مُرسلة.',
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
    savedCampaign: 'Saved',
    sentCampaign: 'Sent',
    saveCampaign: 'Save campaign',
    savingCampaign: 'Saving…',
    campaignSavedNotice: 'Campaign saved and will appear in previous campaigns.',
    saveCampaignFailed: 'Could not save campaign.',
    previewCampaign: 'Unsaved preview',
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
    selectCampaign: 'Select campaign',
    campaignOverview: 'Campaign overview',
    campaignPerformance: 'Message journey',
    cumulativeHint: 'These stages are cumulative: a read message is also counted as delivered and sent.',
    sentTo: 'Sent to',
    deliveredTo: 'Delivered to',
    readBy: 'Read by',
    openedLink: 'Opened activation link',
    recipientResults: 'Guardians in this stage',
    currentMessageState: 'Current status',
    milestoneReachedAt: 'Reached at',
    selectedAudience: 'Selected audience',
    rateOfSelected: 'of selected',
    failedNow: 'Currently failed',
    notSentYet: 'Not sent yet',
    technicalStates: 'Current states and diagnostics',
    milestoneUnavailable: 'Some Messaging statuses are currently unavailable; they are not treated as not sent.',
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
    savedCampaign: 'Enregistrée',
    sentCampaign: 'Envoyée',
    saveCampaign: 'Enregistrer la campagne',
    savingCampaign: 'Enregistrement…',
    campaignSavedNotice: 'La campagne est enregistrée et apparaîtra dans les campagnes précédentes.',
    saveCampaignFailed: 'Impossible d’enregistrer la campagne.',
    previewCampaign: 'Aperçu non enregistré',
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
    selectCampaign: 'Choisir une campagne',
    campaignOverview: 'Résumé de la campagne',
    campaignPerformance: 'Parcours du message',
    cumulativeHint: 'Ces étapes sont cumulatives : un message lu est aussi compté comme livré et envoyé.',
    sentTo: 'Messages envoyés',
    deliveredTo: 'Messages livrés',
    readBy: 'Messages lus',
    openedLink: 'Lien d’activation ouvert',
    recipientResults: 'Responsables dans cette étape',
    currentMessageState: 'État actuel',
    milestoneReachedAt: 'Étape atteinte le',
    selectedAudience: 'Audience sélectionnée',
    rateOfSelected: 'des sélectionnés',
    failedNow: 'Échec actuel',
    notSentYet: 'Pas encore envoyé',
    technicalStates: 'États actuels et diagnostic',
    milestoneUnavailable: 'Certains états Messaging sont indisponibles ; ils ne sont pas considérés comme non envoyés.',
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
    savedCampaign: 'Guardada',
    sentCampaign: 'Enviada',
    saveCampaign: 'Guardar campaña',
    savingCampaign: 'Guardando…',
    campaignSavedNotice: 'La campaña se ha guardado y aparecerá en las campañas anteriores.',
    saveCampaignFailed: 'No se pudo guardar la campaña.',
    previewCampaign: 'Vista previa sin guardar',
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
    selectCampaign: 'Elegir campaña',
    campaignOverview: 'Resumen de campaña',
    campaignPerformance: 'Recorrido del mensaje',
    cumulativeHint: 'Estas etapas son acumulativas: un mensaje leído también cuenta como entregado y enviado.',
    sentTo: 'Enviados',
    deliveredTo: 'Entregados',
    readBy: 'Leídos',
    openedLink: 'Enlace de activación abierto',
    recipientResults: 'Tutores en esta etapa',
    currentMessageState: 'Estado actual',
    milestoneReachedAt: 'Etapa alcanzada el',
    selectedAudience: 'Audiencia seleccionada',
    rateOfSelected: 'de los seleccionados',
    failedNow: 'Fallidos actualmente',
    notSentYet: 'Aún no enviado',
    technicalStates: 'Estados actuales y diagnóstico',
    milestoneUnavailable: 'Algunos estados de Messaging no están disponibles; no se consideran no enviados.',
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

const MILESTONE_LABELS = {
  ar: {
    dispatched: 'بدأ الإرسال',
    sent: 'أُرسلت لهم',
    delivered: 'تم التسليم إليهم',
    read: 'قرأوا الرسالة',
    opened_activation_link: 'فتحوا رابط التفعيل',
  },
  en: {
    dispatched: 'Dispatch started',
    sent: 'Sent to',
    delivered: 'Delivered to',
    read: 'Read by',
    opened_activation_link: 'Opened activation link',
  },
  fr: {
    dispatched: 'Envoi démarré',
    sent: 'Messages envoyés',
    delivered: 'Messages livrés',
    read: 'Messages lus',
    opened_activation_link: 'Lien d’activation ouvert',
  },
  es: {
    dispatched: 'Envío iniciado',
    sent: 'Enviados',
    delivered: 'Entregados',
    read: 'Leídos',
    opened_activation_link: 'Enlace de activación abierto',
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

export function getHistoricalCampaignArchiveStatus(
  item: ParentActivationHistoricalCampaignListItem,
): Exclude<ParentActivationCampaignArchiveStatus, 'preview'> | null {
  if (item.archive_status === 'sent' || item.archive_status === 'saved') {
    return item.archive_status;
  }
  // Compatibility with older runtimes: proven dispatch is safe to classify as sent.
  if (item.funnel.dispatch_enqueued > 0) return 'sent';
  return null;
}


export function getHistoricalMessageStatusLabel(locale: Locale, status: ParentActivationHistoricalMessageStatus) {
  return MESSAGE_LABELS[locale][status];
}

export function getHistoricalActivationStatusLabel(locale: Locale, status: ParentActivationHistoricalActivationStatus) {
  return ACTIVATION_LABELS[locale][status];
}

export function getHistoricalMilestoneLabel(locale: Locale, milestone: ParentActivationHistoricalMilestone) {
  return MILESTONE_LABELS[locale][milestone];
}

export function historicalMilestoneRate(
  summary: ParentActivationHistoricalMilestoneSummary,
  milestone: Exclude<ParentActivationHistoricalMilestone, 'dispatched'>,
): number {
  if (summary.denominator <= 0) return 0;
  return Math.round((summary[milestone] / summary.denominator) * 100);
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
