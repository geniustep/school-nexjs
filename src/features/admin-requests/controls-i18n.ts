import type { Locale } from '@/lib/i18n/config';

const MESSAGES = {
  en: {
    'settings.serviceKind': 'Service type',
    'settings.serviceKindGeneral': 'Administrative request',
    'settings.serviceKindAppointment': 'Appointment request',
    'settings.serviceKindHint': 'Appointment request types unlock the appointment workflow for families.',
    'settings.serviceKindBadgeGeneral': 'Administrative request',
    'settings.serviceKindBadgeAppointment': 'Appointment',
    'list.search': 'Search requests',
    'list.searchPlaceholder': 'Search by subject, reference, student or assignee…',
    'list.filterType': 'Request type',
    'list.allTypes': 'All types',
    'list.filterState': 'Status',
    'list.allStates': 'All statuses',
    'list.showClosed': 'Show closed requests',
    'list.noResults': 'No requests match the current search and filters.',
    'list.filteredCount': '{visible} of {total} requests shown',
  },
  fr: {
    'settings.serviceKind': 'Type de service',
    'settings.serviceKindGeneral': 'Demande administrative',
    'settings.serviceKindAppointment': 'Demande de rendez-vous',
    'settings.serviceKindHint': 'Les types de rendez-vous activent le parcours de prise de rendez-vous pour les familles.',
    'settings.serviceKindBadgeGeneral': 'Demande administrative',
    'settings.serviceKindBadgeAppointment': 'Rendez-vous',
    'list.search': 'Rechercher des demandes',
    'list.searchPlaceholder': 'Rechercher par objet, référence, élève ou responsable…',
    'list.filterType': 'Type de demande',
    'list.allTypes': 'Tous les types',
    'list.filterState': 'Statut',
    'list.allStates': 'Tous les statuts',
    'list.showClosed': 'Afficher les demandes clôturées',
    'list.noResults': 'Aucune demande ne correspond à la recherche et aux filtres actuels.',
    'list.filteredCount': '{visible} demande(s) affichée(s) sur {total}',
  },
  ar: {
    'settings.serviceKind': 'نوع الخدمة',
    'settings.serviceKindGeneral': 'طلب إداري عادي',
    'settings.serviceKindAppointment': 'طلب موعد',
    'settings.serviceKindHint': 'نوع طلب الموعد يفعّل رحلة حجز الموعد للأسر.',
    'settings.serviceKindBadgeGeneral': 'طلب إداري',
    'settings.serviceKindBadgeAppointment': 'موعد',
    'list.search': 'البحث في الطلبات',
    'list.searchPlaceholder': 'ابحث بالموضوع أو المرجع أو التلميذ أو المسؤول…',
    'list.filterType': 'نوع الطلب',
    'list.allTypes': 'كل الأنواع',
    'list.filterState': 'الحالة',
    'list.allStates': 'كل الحالات',
    'list.showClosed': 'إظهار الطلبات المغلقة',
    'list.noResults': 'لا توجد طلبات تطابق البحث والفلاتر الحالية.',
    'list.filteredCount': 'يظهر {visible} من أصل {total} طلب',
  },
  es: {
    'settings.serviceKind': 'Tipo de servicio',
    'settings.serviceKindGeneral': 'Solicitud administrativa',
    'settings.serviceKindAppointment': 'Solicitud de cita',
    'settings.serviceKindHint': 'Los tipos de cita habilitan el flujo de citas para las familias.',
    'settings.serviceKindBadgeGeneral': 'Solicitud administrativa',
    'settings.serviceKindBadgeAppointment': 'Cita',
    'list.search': 'Buscar solicitudes',
    'list.searchPlaceholder': 'Buscar por asunto, referencia, alumno o responsable…',
    'list.filterType': 'Tipo de solicitud',
    'list.allTypes': 'Todos los tipos',
    'list.filterState': 'Estado',
    'list.allStates': 'Todos los estados',
    'list.showClosed': 'Mostrar solicitudes cerradas',
    'list.noResults': 'No hay solicitudes que coincidan con la búsqueda y los filtros actuales.',
    'list.filteredCount': 'Se muestran {visible} de {total} solicitudes',
  },
} as const;

export type AdminRequestControlsMessageKey = keyof typeof MESSAGES.en;

export function adminRequestControlsMessage(
  locale: Locale,
  key: AdminRequestControlsMessageKey,
  params?: Record<string, string | number>,
): string {
  const table = MESSAGES[locale] ?? MESSAGES.en;
  let value: string = table[key] ?? MESSAGES.en[key];
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

export function adminRequestControlsLocaleKeys(locale: Locale): string[] {
  return Object.keys(MESSAGES[locale] ?? MESSAGES.en);
}
