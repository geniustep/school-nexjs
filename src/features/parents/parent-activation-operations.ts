import type {
  ParentActivationCampaignDispatch,
  ParentActivationCampaignRecipient,
  ParentActivationSelectionSource,
} from '../../types/parent-activation-campaign';

import type { Locale } from '@/lib/i18n/config';

export type ParentActivationLocale = Locale;
export type EligibilityFilter = 'all' | 'eligible' | 'ineligible';
export type SelectionFilter = 'all' | 'selected' | 'excluded';
export type ContactFilter = 'all' | 'contacted' | 'not_contacted';
export type ActivationFilter = 'all' | 'activated' | 'not_activated';
export type MessagingFilter =
  | 'all'
  | 'not_dispatched'
  | 'queued'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'status_unavailable';
export type ParentActivationPreset =
  | 'none'
  | 'first_send_ready'
  | 'contacted_not_activated'
  | 'read_not_activated'
  | 'failed'
  | 'needs_remediation'
  | 'manually_excluded'
  | 'manually_included';

export interface ParentActivationRecipientFilters {
  query: string;
  eligibility: EligibilityFilter;
  selection: SelectionFilter;
  contact: ContactFilter;
  messaging: MessagingFilter;
  activation: ActivationFilter;
  selectionSource: ParentActivationSelectionSource | 'all';
  preset: ParentActivationPreset;
}

export const EMPTY_PARENT_ACTIVATION_FILTERS: ParentActivationRecipientFilters = {
  query: '',
  eligibility: 'all',
  selection: 'all',
  contact: 'all',
  messaging: 'all',
  activation: 'all',
  selectionSource: 'all',
  preset: 'none',
};

const COPY = {
  ar: {
    selected: 'مختار للإرسال', excluded: 'مستبعد من الإرسال', previouslyContacted: 'سبق التواصل معه',
    notPreviouslyContacted: 'لم يسبق التواصل معه', manuallyIncluded: 'أُعيد إدراجه يدويًا', manuallyExcluded: 'استُبعد يدويًا',
    autoSelected: 'اختيار تلقائي', defaultExcluded: 'مستبعد افتراضيًا', hardIneligible: 'غير مؤهل', legacy: 'اختيار سابق محفوظ',
    notDispatched: 'لم يُرسل بعد', queued: 'بانتظار الإرسال', processing: 'قيد الإرسال', sent: 'تم الإرسال', delivered: 'تم التسليم',
    read: 'تمت القراءة', failed: 'فشل الإرسال', unavailable: 'حالة الرسالة غير متاحة', activated: 'تم تفعيل الحساب', notActivated: 'لم يتم التفعيل بعد',
  },
  en: {
    selected: 'Selected to send', excluded: 'Excluded from sending', previouslyContacted: 'Previously contacted',
    notPreviouslyContacted: 'Not previously contacted', manuallyIncluded: 'Manually re-included', manuallyExcluded: 'Manually excluded',
    autoSelected: 'Automatic selection', defaultExcluded: 'Default exclusion', hardIneligible: 'Ineligible', legacy: 'Saved legacy selection',
    notDispatched: 'Not sent yet', queued: 'Queued', processing: 'Sending', sent: 'Sent', delivered: 'Delivered', read: 'Read', failed: 'Failed',
    unavailable: 'Message status unavailable', activated: 'Account activated', notActivated: 'Not activated yet',
  },
  fr: {
    selected: 'Sélectionné pour l’envoi', excluded: 'Exclu de l’envoi', previouslyContacted: 'Déjà contacté',
    notPreviouslyContacted: 'Jamais contacté', manuallyIncluded: 'Réintégré manuellement', manuallyExcluded: 'Exclu manuellement',
    autoSelected: 'Sélection automatique', defaultExcluded: 'Exclusion par défaut', hardIneligible: 'Non éligible', legacy: 'Sélection antérieure conservée',
    notDispatched: 'Pas encore envoyé', queued: 'En attente d’envoi', processing: 'En cours d’envoi', sent: 'Envoyé', delivered: 'Livré', read: 'Lu', failed: 'Échec',
    unavailable: 'État du message indisponible', activated: 'Compte activé', notActivated: 'Pas encore activé',
  },
  es: {
    selected: 'Seleccionado para enviar', excluded: 'Excluido del envío', previouslyContacted: 'Contactado anteriormente',
    notPreviouslyContacted: 'No contactado antes', manuallyIncluded: 'Reincluido manualmente', manuallyExcluded: 'Excluido manualmente',
    autoSelected: 'Selección automática', defaultExcluded: 'Exclusión predeterminada', hardIneligible: 'No elegible', legacy: 'Selección anterior conservada',
    notDispatched: 'Aún no enviado', queued: 'En cola', processing: 'Enviando', sent: 'Enviado', delivered: 'Entregado', read: 'Leído', failed: 'Fallido',
    unavailable: 'Estado del mensaje no disponible', activated: 'Cuenta activada', notActivated: 'Aún no activada',
  },
} as const;

export function getParentActivationOperationsCopy(locale: ParentActivationLocale) {
  return COPY[locale];
}


const UI_COPY = {
  ar: {
    operationsTitle: 'تشغيل الحملة', filtersTitle: 'البحث والفلاتر', searchPlaceholder: 'ابحث باسم ولي الأمر…', clearFilters: 'مسح الفلاتر',
    all: 'الكل', eligible: 'مؤهل', ineligible: 'غير مؤهل', selected: 'مختار', excluded: 'مستبعد', contacted: 'سبق التواصل', notContacted: 'لم يسبق التواصل',
    activated: 'فعّل الحساب', notActivated: 'لم يفعّل', presets: 'فلاتر ذكية', firstSend: 'جاهزون لأول إرسال', contactedNotActivated: 'سبق التواصل ولم يفعّلوا',
    readNotActivated: 'تمت القراءة ولم يفعّلوا', failed: 'فشل الإرسال', needsRemediation: 'يحتاجون معالجة', manuallyExcluded: 'مستبعدون يدويًا', manuallyIncluded: 'أُعيد إدراجهم يدويًا',
    audience: 'إجمالي الجمهور', eligibleCount: 'المؤهلون', ineligibleCount: 'غير المؤهلين', selectedForDispatch: 'مختارون للإرسال', defaultExcluded: 'مستبعدون افتراضيًا',
    marked: 'محددون للعمل الجماعي', markVisible: 'تحديد النتائج الظاهرة', clearMarked: 'إلغاء التحديد', includeMarked: 'إدراج المحددين', excludeMarked: 'استبعاد المحددين',
    recipients: 'أولياء الأمور', eligibility: 'الأهلية', selection: 'الاختيار', selectionSource: 'مصدر الاختيار', previousContact: 'التواصل السابق', messageStatus: 'حالة الرسالة', activation: 'التفعيل', action: 'الإجراء',
    include: 'إدراج', exclude: 'استبعاد', processing: 'جارٍ الحفظ…', refreshList: 'تحديث قائمة المستفيدين', preparedAt: 'أُعدّت في',
    noMatch: 'لا توجد نتائج مطابقة لهذه الفلاتر.', noSelected: 'لم يتم اختيار أي ولي للإرسال.', selectedAttempt: 'سيتم محاولة الإرسال إلى', sendCampaign: 'إرسال الحملة',
    confirmDispatch: 'تأكيد إرسال الحملة', bulkUpdated: 'تم تحديث الاختيار', bulkRejected: 'تعذر تحديث بعض العناصر', selectionFailed: 'تعذر حفظ الاختيار.', bulkFailed: 'تعذر تنفيذ العملية الجماعية.',
    messagingUnavailable: 'تعذر جلب حالة الرسائل حاليًا.', remediation: 'معالجة', sendNow: 'إرسال الآن', cancel: 'إلغاء',
  },
  en: {
    operationsTitle: 'Campaign operations', filtersTitle: 'Search and filters', searchPlaceholder: 'Search guardian name…', clearFilters: 'Clear filters', all: 'All', eligible: 'Eligible', ineligible: 'Ineligible', selected: 'Selected', excluded: 'Excluded', contacted: 'Previously contacted', notContacted: 'Not previously contacted', activated: 'Activated', notActivated: 'Not activated', presets: 'Smart filters', firstSend: 'Ready for first send', contactedNotActivated: 'Contacted, not activated', readNotActivated: 'Read, not activated', failed: 'Failed', needsRemediation: 'Needs remediation', manuallyExcluded: 'Manually excluded', manuallyIncluded: 'Manually re-included', audience: 'Total audience', eligibleCount: 'Eligible', ineligibleCount: 'Ineligible', selectedForDispatch: 'Selected to send', defaultExcluded: 'Default excluded', marked: 'Marked for bulk action', markVisible: 'Mark visible results', clearMarked: 'Clear marks', includeMarked: 'Include marked', excludeMarked: 'Exclude marked', recipients: 'Guardians', eligibility: 'Eligibility', selection: 'Selection', selectionSource: 'Selection source', previousContact: 'Previous contact', messageStatus: 'Message status', activation: 'Activation', action: 'Action', include: 'Include', exclude: 'Exclude', processing: 'Saving…', refreshList: 'Refresh recipient list', preparedAt: 'Prepared at', noMatch: 'No results match these filters.', noSelected: 'No guardian is selected for sending.', selectedAttempt: 'Will attempt to send to', sendCampaign: 'Send campaign', confirmDispatch: 'Confirm campaign dispatch', bulkUpdated: 'Selection updated', bulkRejected: 'Some items could not be updated', selectionFailed: 'Could not save selection.', bulkFailed: 'Could not complete bulk action.', messagingUnavailable: 'Message status is temporarily unavailable.', remediation: 'Resolve', sendNow: 'Send now', cancel: 'Cancel',
  },
  fr: {
    operationsTitle: 'Pilotage de la campagne', filtersTitle: 'Recherche et filtres', searchPlaceholder: 'Rechercher un responsable…', clearFilters: 'Effacer les filtres', all: 'Tous', eligible: 'Éligible', ineligible: 'Non éligible', selected: 'Sélectionné', excluded: 'Exclu', contacted: 'Déjà contacté', notContacted: 'Jamais contacté', activated: 'Activé', notActivated: 'Non activé', presets: 'Filtres intelligents', firstSend: 'Prêts pour le premier envoi', contactedNotActivated: 'Contactés non activés', readNotActivated: 'Lus non activés', failed: 'Échec', needsRemediation: 'À corriger', manuallyExcluded: 'Exclus manuellement', manuallyIncluded: 'Réintégrés manuellement', audience: 'Audience totale', eligibleCount: 'Éligibles', ineligibleCount: 'Non éligibles', selectedForDispatch: 'Sélectionnés pour l’envoi', defaultExcluded: 'Exclus par défaut', marked: 'Marqués pour action groupée', markVisible: 'Marquer les résultats visibles', clearMarked: 'Effacer la sélection', includeMarked: 'Inclure les marqués', excludeMarked: 'Exclure les marqués', recipients: 'Responsables', eligibility: 'Éligibilité', selection: 'Sélection', selectionSource: 'Source de sélection', previousContact: 'Contact antérieur', messageStatus: 'État du message', activation: 'Activation', action: 'Action', include: 'Inclure', exclude: 'Exclure', processing: 'Enregistrement…', refreshList: 'Actualiser la liste', preparedAt: 'Préparée le', noMatch: 'Aucun résultat ne correspond à ces filtres.', noSelected: 'Aucun responsable sélectionné pour l’envoi.', selectedAttempt: 'Tentative d’envoi vers', sendCampaign: 'Envoyer la campagne', confirmDispatch: 'Confirmer l’envoi', bulkUpdated: 'Sélection mise à jour', bulkRejected: 'Certains éléments n’ont pas été mis à jour', selectionFailed: 'Impossible d’enregistrer la sélection.', bulkFailed: 'Impossible d’exécuter l’action groupée.', messagingUnavailable: 'État des messages temporairement indisponible.', remediation: 'Corriger', sendNow: 'Envoyer', cancel: 'Annuler',
  },
  es: {
    operationsTitle: 'Operación de campaña', filtersTitle: 'Búsqueda y filtros', searchPlaceholder: 'Buscar tutor…', clearFilters: 'Limpiar filtros', all: 'Todos', eligible: 'Elegible', ineligible: 'No elegible', selected: 'Seleccionado', excluded: 'Excluido', contacted: 'Contactado antes', notContacted: 'No contactado', activated: 'Activado', notActivated: 'No activado', presets: 'Filtros inteligentes', firstSend: 'Listos para primer envío', contactedNotActivated: 'Contactados no activados', readNotActivated: 'Leídos no activados', failed: 'Fallido', needsRemediation: 'Necesita corrección', manuallyExcluded: 'Excluidos manualmente', manuallyIncluded: 'Reincluidos manualmente', audience: 'Audiencia total', eligibleCount: 'Elegibles', ineligibleCount: 'No elegibles', selectedForDispatch: 'Seleccionados para enviar', defaultExcluded: 'Excluidos por defecto', marked: 'Marcados para acción masiva', markVisible: 'Marcar resultados visibles', clearMarked: 'Limpiar marcados', includeMarked: 'Incluir marcados', excludeMarked: 'Excluir marcados', recipients: 'Tutores', eligibility: 'Elegibilidad', selection: 'Selección', selectionSource: 'Origen de selección', previousContact: 'Contacto previo', messageStatus: 'Estado del mensaje', activation: 'Activación', action: 'Acción', include: 'Incluir', exclude: 'Excluir', processing: 'Guardando…', refreshList: 'Actualizar lista', preparedAt: 'Preparada el', noMatch: 'No hay resultados para estos filtros.', noSelected: 'No hay tutores seleccionados para enviar.', selectedAttempt: 'Se intentará enviar a', sendCampaign: 'Enviar campaña', confirmDispatch: 'Confirmar envío', bulkUpdated: 'Selección actualizada', bulkRejected: 'Algunos elementos no pudieron actualizarse', selectionFailed: 'No se pudo guardar la selección.', bulkFailed: 'No se pudo completar la acción masiva.', messagingUnavailable: 'Estado de mensajes temporalmente no disponible.', remediation: 'Corregir', sendNow: 'Enviar ahora', cancel: 'Cancelar',
  },
} as const;

export function getParentActivationOperationsUiCopy(locale: ParentActivationLocale) {
  return UI_COPY[locale];
}

export function recipientIsActivated(recipient: ParentActivationCampaignRecipient): boolean {
  return Boolean(recipient.messaging?.activation?.activated_at);
}

export function recipientMessagingBucket(
  recipient: ParentActivationCampaignRecipient,
  messagingStatusAvailable = true,
): MessagingFilter {
  if (!messagingStatusAvailable) return 'status_unavailable';
  if (!recipient.messaging) return 'not_dispatched';
  if (recipient.messaging.status_reason) return 'status_unavailable';
  const state = recipient.messaging.state;
  if (state === 'queued' || state === 'processing' || state === 'sent' || state === 'delivered' || state === 'read' || state === 'failed') {
    return state;
  }
  return 'status_unavailable';
}

export function getMessagingStatusMeta(
  locale: ParentActivationLocale,
  recipient: ParentActivationCampaignRecipient,
  messagingStatusAvailable = true,
) {
  const copy = COPY[locale];
  const bucket = recipientMessagingBucket(recipient, messagingStatusAvailable);
  const mapping: Record<MessagingFilter, { label: string; tone: 'green' | 'red' | 'amber' | 'blue' | 'slate' }> = {
    all: { label: copy.unavailable, tone: 'slate' },
    not_dispatched: { label: copy.notDispatched, tone: 'slate' },
    queued: { label: copy.queued, tone: 'blue' },
    processing: { label: copy.processing, tone: 'blue' },
    sent: { label: copy.sent, tone: 'blue' },
    delivered: { label: copy.delivered, tone: 'green' },
    read: { label: copy.read, tone: 'green' },
    failed: { label: copy.failed, tone: 'red' },
    status_unavailable: { label: copy.unavailable, tone: 'amber' },
  };
  return mapping[bucket];
}

export function getSelectionStatusMeta(locale: ParentActivationLocale, recipient: ParentActivationCampaignRecipient) {
  const copy = COPY[locale];
  if (!recipient.eligible_for_send) return { label: copy.hardIneligible, tone: 'amber' as const };
  if (recipient.selection_source === 'manual_include') return { label: copy.manuallyIncluded, tone: 'green' as const };
  if (recipient.selection_source === 'manual_exclude') return { label: copy.manuallyExcluded, tone: 'amber' as const };
  if (recipient.selection_source === 'default_excluded_previously_contacted') return { label: copy.defaultExcluded, tone: 'amber' as const };
  if (recipient.selection_source === 'legacy_existing_campaign') return { label: copy.legacy, tone: 'blue' as const };
  return recipient.selected_for_send
    ? { label: copy.selected, tone: 'green' as const }
    : { label: copy.excluded, tone: 'slate' as const };
}

function matchesPreset(
  recipient: ParentActivationCampaignRecipient,
  preset: ParentActivationPreset,
  messagingStatusAvailable = true,
): boolean {
  if (preset === 'none') return true;
  const activated = recipientIsActivated(recipient);
  const bucket = recipientMessagingBucket(recipient, messagingStatusAvailable);
  if (preset === 'first_send_ready') return recipient.eligible_for_send && recipient.selected_for_send && !recipient.contact_attempted_at_prepare;
  if (preset === 'contacted_not_activated') return recipient.contact_attempted_at_prepare && !activated;
  if (preset === 'read_not_activated') return bucket === 'read' && !activated;
  if (preset === 'failed') return bucket === 'failed';
  if (preset === 'needs_remediation') return !recipient.eligible_for_send;
  if (preset === 'manually_excluded') return recipient.selection_source === 'manual_exclude';
  return recipient.selection_source === 'manual_include';
}

export function filterParentActivationRecipients(
  recipients: ParentActivationCampaignRecipient[],
  filters: ParentActivationRecipientFilters,
  messagingStatusAvailable = true,
): ParentActivationCampaignRecipient[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return recipients.filter((recipient) => {
    if (query && !recipient.parent_name.toLocaleLowerCase().includes(query)) return false;
    if (filters.eligibility === 'eligible' && !recipient.eligible_for_send) return false;
    if (filters.eligibility === 'ineligible' && recipient.eligible_for_send) return false;
    if (filters.selection === 'selected' && !recipient.selected_for_send) return false;
    if (filters.selection === 'excluded' && recipient.selected_for_send) return false;
    if (filters.contact === 'contacted' && !recipient.contact_attempted_at_prepare) return false;
    if (filters.contact === 'not_contacted' && recipient.contact_attempted_at_prepare) return false;
    if (filters.messaging !== 'all' && recipientMessagingBucket(recipient, messagingStatusAvailable) !== filters.messaging) return false;
    const activated = recipientIsActivated(recipient);
    if (filters.activation === 'activated' && !activated) return false;
    if (filters.activation === 'not_activated' && activated) return false;
    if (filters.selectionSource !== 'all' && recipient.selection_source !== filters.selectionSource) return false;
    return matchesPreset(recipient, filters.preset, messagingStatusAvailable);
  });
}

export function getBulkSelectionRejectedLabel(locale: ParentActivationLocale, reasonCode: string): string {
  const labels = {
    ar: { ineligible: 'بعض أولياء الأمور لم يعودوا مؤهلين للإدراج في الإرسال.', generic: 'تعذر تحديث بعض أولياء الأمور.' },
    en: { ineligible: 'Some guardians are no longer eligible to be included.', generic: 'Some guardians could not be updated.' },
    fr: { ineligible: 'Certains responsables ne sont plus éligibles à l’inclusion.', generic: 'Certains responsables n’ont pas pu être mis à jour.' },
    es: { ineligible: 'Algunos tutores ya no son elegibles para incluirse.', generic: 'No se pudieron actualizar algunos tutores.' },
  } as const;
  return reasonCode === 'recipient_not_eligible_for_selection'
    ? labels[locale].ineligible
    : labels[locale].generic;
}

export function buildBulkSelectionBody(recipientIds: number[], selectedForSend: boolean) {
  const unique = Array.from(new Set(recipientIds.filter((id) => Number.isInteger(id) && id > 0)));
  return selectedForSend
    ? { include_recipient_ids: unique, exclude_recipient_ids: [] }
    : { include_recipient_ids: [], exclude_recipient_ids: unique };
}

export function canDispatchSelected(selectedForDispatch: number, preparing: boolean, dispatching: boolean): boolean {
  return Number.isFinite(selectedForDispatch) && selectedForDispatch > 0 && !preparing && !dispatching;
}
