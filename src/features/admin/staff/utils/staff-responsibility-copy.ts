import type { Locale } from '@/lib/i18n/config';
import type { StaffResponsibilityErrorKind } from './staff-responsibility-assignment-contract';

export type StaffResponsibilityCopy = {
  title: string;
  description: string;
  add: string;
  edit: string;
  end: string;
  legacy: string;
  manual: string;
  readOnly: string;
  effective: string;
  inactive: string;
  scope: string;
  scopeSchool: string;
  scopeCycle: string;
  scopeLevels: string;
  scopeClasses: string;
  capabilities: string;
  dates: string;
  from: string;
  to: string;
  openEnded: string;
  empty: string;
  loading: string;
  retry: string;
  createTitle: string;
  editTitle: string;
  save: string;
  cancel: string;
  chooseScope: string;
  chooseCapabilities: string;
  noGrantableCapabilities: string;
  effectiveFrom: string;
  effectiveTo: string;
  selectAtLeastOneCapability: string;
  selectScopeTargets: string;
  created: string;
  updated: string;
  ended: string;
  endTitle: string;
  endBody: string;
  endConfirm: string;
  yearPolicy: string;
  yearFollowsContext: string;
  yearBound: string;
  yearUnbounded: string;
  academicYear: string;
  selectAcademicYear: string;
  academicContextUnavailable: string;
  summaryTotal: string;
  summaryActive: string;
  summaryManual: string;
  summaryLegacy: string;
  sourceTitle: string;
  sourceDescription: string;
  sourceUnavailable: string;
  unknownScope: string;
  selectedCount: (count: number) => string;
  error: Record<StaffResponsibilityErrorKind, string>;
};

export const STAFF_RESPONSIBILITY_COPY: Record<Locale, StaffResponsibilityCopy> = {
  ar: {
    title: 'المسؤوليات',
    description: 'المسؤوليات الممنوحة لهذا الموظف والنطاق الذي تعمل داخله. الصلاحيات الفعلية تبقى مرجع التنفيذ النهائي.',
    add: 'إضافة مسؤولية',
    edit: 'تعديل',
    end: 'إنهاء المسؤولية',
    legacy: 'إعداد سابق',
    manual: 'مسؤولية مخصصة',
    readOnly: 'للقراءة فقط',
    effective: 'فعالة الآن',
    inactive: 'غير فعالة',
    scope: 'النطاق',
    scopeSchool: 'المدرسة',
    scopeCycle: 'السلك',
    scopeLevels: 'المستويات',
    scopeClasses: 'الأقسام',
    capabilities: 'الصلاحيات',
    dates: 'فترة السريان',
    from: 'من',
    to: 'إلى',
    openEnded: 'مفتوحة',
    empty: 'لا توجد مسؤوليات مسجلة في هذا السياق المدرسي.',
    loading: 'جارٍ تحميل المسؤوليات…',
    retry: 'إعادة المحاولة',
    createTitle: 'إضافة مسؤولية',
    editTitle: 'تعديل المسؤولية',
    save: 'حفظ',
    cancel: 'إلغاء',
    chooseScope: 'مجال المسؤولية',
    chooseCapabilities: 'اختر الصلاحيات',
    noGrantableCapabilities: 'لا توجد صلاحيات متاحة للإسناد في السياق الحالي.',
    effectiveFrom: 'تاريخ البداية',
    effectiveTo: 'تاريخ النهاية (اختياري)',
    selectAtLeastOneCapability: 'اختر صلاحية واحدة على الأقل.',
    selectScopeTargets: 'اختر عناصر النطاق المطلوبة.',
    created: 'تمت إضافة المسؤولية.',
    updated: 'تم تحديث المسؤولية.',
    ended: 'تم إنهاء المسؤولية.',
    endTitle: 'إنهاء المسؤولية',
    endBody: 'سيتم إيقاف هذه المسؤولية دون حذف سجلها، وسيبقى تاريخها محفوظًا للتدقيق.',
    endConfirm: 'إنهاء',
    yearPolicy: 'ارتباط السنة الدراسية',
    yearFollowsContext: 'يتبع السنة الدراسية النشطة',
    yearBound: 'مرتبط بسنة محددة',
    yearUnbounded: 'غير مرتبط بسنة',
    academicYear: 'السنة الدراسية',
    selectAcademicYear: 'اختر السنة الدراسية',
    academicContextUnavailable: 'تعذر تحميل بعض خيارات السياق الأكاديمي. يمكن الاستمرار بالنطاقات المتاحة فقط.',
    summaryTotal: 'الإجمالي',
    summaryActive: 'النشطة',
    summaryManual: 'المخصصة',
    summaryLegacy: 'الإعدادات السابقة',
    sourceTitle: 'مصادر الصلاحيات الفعلية',
    sourceDescription: 'يبين كل مصدر المسؤولية والنطاق والفترة التي منحت الصلاحية، دون دمج النطاقات المختلفة.',
    sourceUnavailable: 'لا يتوفر شرح تفصيلي لمصادر الصلاحيات في هذا السياق.',
    unknownScope: 'نطاق غير متاح',
    selectedCount: (count) => `${count} محدد`,
    error: {
      legacy_read_only: 'هذا الإعداد السابق للقراءة فقط ولا يمكن تعديله.',
      outside_school: 'يتضمن النطاق عنصرًا خارج المدرسة النشطة.',
      scope_required: 'راجع نوع النطاق والعناصر المحددة.',
      capability_required: 'اختر صلاحية واحدة على الأقل ومن الصلاحيات المسموح بإسنادها.',
      year_required: 'اختر السنة الدراسية المطلوبة لهذا النوع من الارتباط.',
      year_conflict: 'السنة الدراسية لا تنتمي إلى المدرسة النشطة أو لا تطابق السياسة المختارة.',
      period_invalid: 'تاريخ النهاية يجب ألا يسبق تاريخ البداية.',
      already_ended: 'هذه المسؤولية منتهية ولا يمكن تعديلها أو إعادة تفعيلها من هنا.',
      not_found: 'المسؤولية غير موجودة أو خارج نطاقك المسموح.',
      forbidden: 'ليست لديك صلاحية لإجراء هذا التغيير.',
      generic: 'تعذر حفظ التغيير. راجع البيانات وحاول مرة أخرى.',
    },
  },
  en: {
    title: 'Responsibilities', description: 'Assigned responsibilities and the scope where they apply. Effective permissions remain the final execution view.', add: 'Add responsibility', edit: 'Edit', end: 'End responsibility', legacy: 'Previous setup', manual: 'Custom responsibility', readOnly: 'Read only', effective: 'Effective now', inactive: 'Not effective', scope: 'Scope', scopeSchool: 'School', scopeCycle: 'Cycle', scopeLevels: 'Levels', scopeClasses: 'Classes', capabilities: 'Permissions', dates: 'Effective period', from: 'From', to: 'To', openEnded: 'Open-ended', empty: 'No responsibilities are recorded in this school context.', loading: 'Loading responsibilities…', retry: 'Retry', createTitle: 'Add responsibility', editTitle: 'Edit responsibility', save: 'Save', cancel: 'Cancel', chooseScope: 'Responsibility scope', chooseCapabilities: 'Choose permissions', noGrantableCapabilities: 'No grantable permissions are available in the current context.', effectiveFrom: 'Start date', effectiveTo: 'End date (optional)', selectAtLeastOneCapability: 'Select at least one permission.', selectScopeTargets: 'Select the required scope items.', created: 'Responsibility added.', updated: 'Responsibility updated.', ended: 'Responsibility ended.', endTitle: 'End responsibility', endBody: 'This responsibility will stop without deleting its history. The record remains available for audit.', endConfirm: 'End', yearPolicy: 'Academic-year binding', yearFollowsContext: 'Follow active academic year', yearBound: 'Bind to a specific year', yearUnbounded: 'Not bound to a year', academicYear: 'Academic year', selectAcademicYear: 'Select academic year', academicContextUnavailable: 'Some academic-context options could not be loaded. You can continue with the available scopes only.', summaryTotal: 'Total', summaryActive: 'Active', summaryManual: 'Custom', summaryLegacy: 'Previous setup', sourceTitle: 'Effective permission sources', sourceDescription: 'Each source keeps its responsibility, scope and effective period separate.', sourceUnavailable: 'Detailed permission-source explanation is unavailable in this context.', unknownScope: 'Unavailable scope', selectedCount: (count) => `${count} selected`,
    error: { legacy_read_only: 'Previous setup is read-only.', outside_school: 'The selected scope contains an item outside the active school.', scope_required: 'Review the selected scope type and targets.', capability_required: 'Select at least one grantable permission.', year_required: 'Select the required academic year.', year_conflict: 'The academic year does not match the active school or selected policy.', period_invalid: 'End date cannot be before start date.', already_ended: 'This responsibility has ended and cannot be edited or reactivated here.', not_found: 'The responsibility was not found or is outside your allowed scope.', forbidden: 'You are not allowed to make this change.', generic: 'The change could not be saved. Review the data and try again.' },
  },
  fr: {
    title: 'Responsabilités', description: 'Responsabilités attribuées et périmètre d’application. Les autorisations effectives restent la référence finale.', add: 'Ajouter une responsabilité', edit: 'Modifier', end: 'Mettre fin', legacy: 'Paramétrage antérieur', manual: 'Responsabilité personnalisée', readOnly: 'Lecture seule', effective: 'Effective maintenant', inactive: 'Non effective', scope: 'Périmètre', scopeSchool: 'Établissement', scopeCycle: 'Cycle', scopeLevels: 'Niveaux', scopeClasses: 'Classes', capabilities: 'Autorisations', dates: 'Période d’effet', from: 'Du', to: 'Au', openEnded: 'Sans date de fin', empty: 'Aucune responsabilité enregistrée dans ce contexte scolaire.', loading: 'Chargement des responsabilités…', retry: 'Réessayer', createTitle: 'Ajouter une responsabilité', editTitle: 'Modifier la responsabilité', save: 'Enregistrer', cancel: 'Annuler', chooseScope: 'Périmètre de responsabilité', chooseCapabilities: 'Choisir les autorisations', noGrantableCapabilities: 'Aucune autorisation attribuable dans le contexte actuel.', effectiveFrom: 'Date de début', effectiveTo: 'Date de fin (facultative)', selectAtLeastOneCapability: 'Sélectionnez au moins une autorisation.', selectScopeTargets: 'Sélectionnez les éléments requis du périmètre.', created: 'Responsabilité ajoutée.', updated: 'Responsabilité mise à jour.', ended: 'Responsabilité terminée.', endTitle: 'Mettre fin à la responsabilité', endBody: 'Cette responsabilité cessera sans supprimer son historique. Le registre restera conservé pour l’audit.', endConfirm: 'Mettre fin', yearPolicy: 'Lien avec l’année scolaire', yearFollowsContext: 'Suivre l’année scolaire active', yearBound: 'Lier à une année précise', yearUnbounded: 'Sans lien avec une année', academicYear: 'Année scolaire', selectAcademicYear: 'Choisir l’année scolaire', academicContextUnavailable: 'Certaines options du contexte académique n’ont pas pu être chargées. Les périmètres disponibles restent utilisables.', summaryTotal: 'Total', summaryActive: 'Actives', summaryManual: 'Personnalisées', summaryLegacy: 'Paramétrages antérieurs', sourceTitle: 'Sources des autorisations effectives', sourceDescription: 'Chaque source conserve séparément la responsabilité, le périmètre et la période qui accordent l’autorisation.', sourceUnavailable: 'Le détail des sources d’autorisation n’est pas disponible dans ce contexte.', unknownScope: 'Périmètre indisponible', selectedCount: (count) => `${count} sélectionné(s)`,
    error: { legacy_read_only: 'Le paramétrage antérieur est en lecture seule.', outside_school: 'Le périmètre choisi contient un élément hors de l’établissement actif.', scope_required: 'Vérifiez le type de périmètre et les éléments sélectionnés.', capability_required: 'Sélectionnez au moins une autorisation attribuable.', year_required: 'Sélectionnez l’année scolaire requise.', year_conflict: 'L’année scolaire ne correspond pas à l’établissement actif ou à la politique choisie.', period_invalid: 'La date de fin ne peut pas précéder la date de début.', already_ended: 'Cette responsabilité est terminée et ne peut pas être modifiée ou réactivée ici.', not_found: 'La responsabilité est introuvable ou hors de votre périmètre autorisé.', forbidden: 'Vous n’êtes pas autorisé à effectuer ce changement.', generic: 'Impossible d’enregistrer la modification. Vérifiez les données puis réessayez.' },
  },
  es: {
    title: 'Responsabilidades', description: 'Responsabilidades asignadas y su alcance. Los permisos efectivos siguen siendo la referencia final de ejecución.', add: 'Añadir responsabilidad', edit: 'Editar', end: 'Finalizar responsabilidad', legacy: 'Configuración anterior', manual: 'Responsabilidad personalizada', readOnly: 'Solo lectura', effective: 'Efectiva ahora', inactive: 'No efectiva', scope: 'Alcance', scopeSchool: 'Centro', scopeCycle: 'Ciclo', scopeLevels: 'Niveles', scopeClasses: 'Clases', capabilities: 'Permisos', dates: 'Periodo efectivo', from: 'Desde', to: 'Hasta', openEnded: 'Sin fecha final', empty: 'No hay responsabilidades registradas en este contexto escolar.', loading: 'Cargando responsabilidades…', retry: 'Reintentar', createTitle: 'Añadir responsabilidad', editTitle: 'Editar responsabilidad', save: 'Guardar', cancel: 'Cancelar', chooseScope: 'Alcance de la responsabilidad', chooseCapabilities: 'Elegir permisos', noGrantableCapabilities: 'No hay permisos asignables en el contexto actual.', effectiveFrom: 'Fecha de inicio', effectiveTo: 'Fecha final (opcional)', selectAtLeastOneCapability: 'Selecciona al menos un permiso.', selectScopeTargets: 'Selecciona los elementos de alcance requeridos.', created: 'Responsabilidad añadida.', updated: 'Responsabilidad actualizada.', ended: 'Responsabilidad finalizada.', endTitle: 'Finalizar responsabilidad', endBody: 'Esta responsabilidad dejará de estar activa sin borrar su historial. El registro se conservará para auditoría.', endConfirm: 'Finalizar', yearPolicy: 'Vinculación al año académico', yearFollowsContext: 'Seguir el año académico activo', yearBound: 'Vincular a un año específico', yearUnbounded: 'Sin vínculo a un año', academicYear: 'Año académico', selectAcademicYear: 'Seleccionar año académico', academicContextUnavailable: 'No se pudieron cargar algunas opciones del contexto académico. Puedes continuar con los alcances disponibles.', summaryTotal: 'Total', summaryActive: 'Activas', summaryManual: 'Personalizadas', summaryLegacy: 'Configuración anterior', sourceTitle: 'Fuentes de permisos efectivos', sourceDescription: 'Cada fuente mantiene separadas la responsabilidad, el alcance y el periodo que conceden el permiso.', sourceUnavailable: 'El detalle de las fuentes de permisos no está disponible en este contexto.', unknownScope: 'Alcance no disponible', selectedCount: (count) => `${count} seleccionados`,
    error: { legacy_read_only: 'La configuración anterior es de solo lectura.', outside_school: 'El alcance seleccionado contiene un elemento fuera del centro activo.', scope_required: 'Revisa el tipo de alcance y los elementos seleccionados.', capability_required: 'Selecciona al menos un permiso asignable.', year_required: 'Selecciona el año académico requerido.', year_conflict: 'El año académico no coincide con el centro activo o la política seleccionada.', period_invalid: 'La fecha final no puede ser anterior a la fecha de inicio.', already_ended: 'Esta responsabilidad ha finalizado y no puede editarse ni reactivarse aquí.', not_found: 'La responsabilidad no existe o está fuera de tu alcance permitido.', forbidden: 'No tienes permiso para realizar este cambio.', generic: 'No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.' },
  },
};

export function staffResponsibilityErrorMessage(
  copy: StaffResponsibilityCopy,
  kind: StaffResponsibilityErrorKind,
  fallback?: string,
): string {
  if (kind === 'generic' && fallback) return fallback;
  return copy.error[kind];
}
