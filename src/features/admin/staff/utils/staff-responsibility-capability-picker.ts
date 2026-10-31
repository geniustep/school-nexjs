import type { Locale } from '@/lib/i18n/config';
import type { StaffCapabilityOption } from '@/types/academic-setup';

/** Presentation only: never turns an unavailable capability into a grantable one. */
export const RESPONSIBILITY_PICKER_COPY: Record<Locale, {
  searchLabel: string;
  searchPlaceholder: string;
  selectedOnly: string;
  selectedCount: (count: number) => string;
  noResults: string;
  selectedOutsideCatalog: (count: number) => string;
}> = {
  ar: {
    searchLabel: 'البحث عن صلاحية',
    searchPlaceholder: 'ابحث عن الحضور، التلاميذ، التصدير أو الرمز التقني',
    selectedOnly: 'عرض الصلاحيات المختارة فقط',
    selectedCount: (count) => `${count} صلاحية مختارة`,
    noResults: 'لا توجد صلاحيات تطابق البحث أو الفلتر الحالي.',
    selectedOutsideCatalog: (count) => `${count} من الصلاحيات المختارة سابقًا غير متاحة للمنح في الكتالوج الحالي. ستبقى محفوظة في النموذج حتى مراجعتها.`,
  },
  fr: {
    searchLabel: 'Rechercher une autorisation',
    searchPlaceholder: 'Présence, élèves, export ou code technique',
    selectedOnly: 'Afficher uniquement les autorisations sélectionnées',
    selectedCount: (count) => `${count} autorisation(s) sélectionnée(s)`,
    noResults: 'Aucune autorisation ne correspond aux filtres.',
    selectedOutsideCatalog: (count) => `${count} autorisation(s) précédemment sélectionnée(s) ne sont plus attribuables dans le catalogue actuel ; elles restent dans le formulaire pour vérification.`,
  },
  en: {
    searchLabel: 'Search permissions',
    searchPlaceholder: 'Attendance, students, export, or permission code',
    selectedOnly: 'Show selected permissions only',
    selectedCount: (count) => `${count} permission(s) selected`,
    noResults: 'No permissions match your search or filters.',
    selectedOutsideCatalog: (count) => `${count} previously selected permission(s) are not grantable in the current catalog and remain in the form for review.`,
  },
  es: {
    searchLabel: 'Buscar permisos',
    searchPlaceholder: 'Asistencia, estudiantes, exportación o código',
    selectedOnly: 'Mostrar solo los permisos seleccionados',
    selectedCount: (count) => `${count} permiso(s) seleccionado(s)`,
    noResults: 'Ningún permiso coincide con la búsqueda o los filtros.',
    selectedOutsideCatalog: (count) => `${count} permiso(s) previamente seleccionado(s) ya no se pueden conceder en el catálogo actual; siguen en el formulario para revisión.`,
  },
};

const GENERIC_ACTION_NAMES: Record<Locale, Record<string, string>> = {
  ar: { view: 'الاطلاع على', manage: 'إدارة', edit: 'تعديل', create: 'إنشاء', archive: 'أرشفة', review: 'مراجعة', publish: 'نشر', export: 'تصدير', correct: 'تصحيح', record: 'تسجيل', approve: 'اعتماد', void: 'إبطال' },
  fr: { view: 'Consulter', manage: 'Gérer', edit: 'Modifier', create: 'Créer', archive: 'Archiver', review: 'Examiner', publish: 'Publier', export: 'Exporter', correct: 'Corriger', record: 'Enregistrer', approve: 'Approuver', void: 'Annuler' },
  en: { view: 'View', manage: 'Manage', edit: 'Edit', create: 'Create', archive: 'Archive', review: 'Review', publish: 'Publish', export: 'Export', correct: 'Correct', record: 'Record', approve: 'Approve', void: 'Void' },
  es: { view: 'Consultar', manage: 'Gestionar', edit: 'Editar', create: 'Crear', archive: 'Archivar', review: 'Revisar', publish: 'Publicar', export: 'Exportar', correct: 'Corregir', record: 'Registrar', approve: 'Aprobar', void: 'Anular' },
};

const AMBIGUOUS_ACTION_LABELS = new Set([
  'view', 'manage', 'edit', 'create', 'archive', 'review', 'publish',
  'export', 'correct', 'record', 'approve', 'void', 'admin summary', 'publish limited',
  'voir', 'consulter', 'gérer', 'modifier', 'créer', 'archiver', 'publier', 'exporter',
  'ver', 'consultar', 'gestionar', 'editar', 'crear', 'publicar', 'exportar',
  'عرض', 'مشاهدة', 'الاطلاع', 'إدارة', 'تعديل', 'إنشاء', 'أرشفة', 'مراجعة',
  'نشر', 'تصدير', 'تصحيح', 'تسجيل', 'اعتماد', 'إبطال',
]);

/** Never show a bare 'view'/'manage' label; retain the backend code alongside the label. */
export function readableResponsibilityCapabilityLabel(
  capability: Pick<StaffCapabilityOption, 'code' | 'label' | 'category'>,
  localizedLabel: string,
  localizedCategory: string,
  locale: Locale,
): string {
  const label = localizedLabel.trim();
  const parts = capability.code.toLowerCase().split(/[._-]+/).filter(Boolean);
  const actions = GENERIC_ACTION_NAMES.en;
  const action = parts.find((part) => part in actions);
  const ambiguous = !label || AMBIGUOUS_ACTION_LABELS.has(label.toLowerCase());
  if (!ambiguous) return label;
  const category = localizedCategory.trim() || capability.category || capability.code;
  if (action && GENERIC_ACTION_NAMES[locale][action]) {
    return `${GENERIC_ACTION_NAMES[locale][action]} ${category}`;
  }
  return `${category} · ${capability.code}`;
}

export function grantableResponsibilityCapabilities(items: StaffCapabilityOption[]): StaffCapabilityOption[] {
  const seen = new Set<string>();
  return items.filter((capability) => {
    if (capability.grantable !== true || seen.has(capability.code)) return false;
    seen.add(capability.code);
    return true;
  });
}

export function filterResponsibilityCapabilities(
  items: StaffCapabilityOption[],
  query: string,
  selectedOnly: boolean,
  selectedCodes: readonly string[],
  getDisplayLabel: (capability: StaffCapabilityOption) => string,
  getCategoryLabel: (category: string) => string,
): StaffCapabilityOption[] {
  const normalized = query.trim().toLocaleLowerCase();
  const selected = new Set(selectedCodes);
  return items.filter((capability) => {
    if (selectedOnly && !selected.has(capability.code)) return false;
    if (!normalized) return true;
    const searchable = [
      getDisplayLabel(capability),
      getCategoryLabel(capability.category),
      capability.label,
      capability.category,
      capability.code,
    ].join(' ').toLocaleLowerCase();
    return searchable.includes(normalized);
  });
}

export function countUnavailableSelectedCapabilities(
  available: readonly Pick<StaffCapabilityOption, 'code'>[],
  selectedCodes: readonly string[],
): number {
  const codes = new Set(available.map((capability) => capability.code));
  return selectedCodes.filter((code) => !codes.has(code)).length;
}
