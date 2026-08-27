import type { Locale } from '@/lib/i18n/config';

export type FeeSetupFacadeCopy = {
  workspaceTitle: string;
  workspaceDescription: string;
  manageServices: string;
  addSetup: string;
  createTitle: string;
  editTitle: string;
  viewTitle: string;
  createDescription: string;
  setupInfo: string;
  setupName: string;
  internalCode: string;
  scopeTitle: string;
  itemsTitle: string;
  addItem: string;
  noItems: string;
  saveTemporarily: string;
  saveAndApply: string;
  listSetup: string;
  listItems: string;
  listTotal: string;
  confirm: string;
  confirmMessage: string;
  emptyTitle: string;
  emptyDescription: string;
  noMatchTitle: string;
  noMatchDescription: string;
  metrics: {
    total: string;
    confirmed: string;
    draft: string;
    archived: string;
  };
};

const COPY: Record<Locale, FeeSetupFacadeCopy> = {
  ar: {
    workspaceTitle: 'الرسوم الدراسية',
    workspaceDescription: 'حدّد رسوم التسجيل والواجب الشهري والخدمات حسب السنة والمستوى.',
    manageServices: 'الخدمات والرسوم',
    addSetup: 'إعداد الرسوم',
    createTitle: 'إعداد الرسوم',
    editTitle: 'تعديل الرسوم',
    viewTitle: 'تفاصيل الرسوم',
    createDescription: 'اختر المستويات وحدد رسوم التسجيل والتمدرس والخدمات التي تنطبق عليها.',
    setupInfo: 'بيانات الإعداد',
    setupName: 'اسم الإعداد',
    internalCode: 'رمز داخلي',
    scopeTitle: 'المستويات',
    itemsTitle: 'الرسوم والخدمات',
    addItem: 'إضافة رسم أو خدمة',
    noItems: 'لا توجد رسوم أو خدمات بعد.',
    saveTemporarily: 'حفظ مؤقتًا',
    saveAndApply: 'حفظ وتطبيق',
    listSetup: 'الإعداد',
    listItems: 'الرسوم والخدمات',
    listTotal: 'الإجمالي',
    confirm: 'تطبيق',
    confirmMessage: 'هل تريد جعل هذه الرسوم جاهزة للتطبيق على التلاميذ؟',
    emptyTitle: 'لم تُعدّ الرسوم الدراسية بعد',
    emptyDescription: 'ابدأ بتحديد رسوم التسجيل والواجب الشهري والخدمات حسب المستوى.',
    noMatchTitle: 'لا توجد رسوم مطابقة',
    noMatchDescription: 'غيّر البحث أو المرشحات لعرض إعدادات رسوم أخرى.',
    metrics: {
      total: 'كل الإعدادات',
      confirmed: 'جاهزة للتطبيق',
      draft: 'غير مكتملة',
      archived: 'مؤرشفة',
    },
  },
  fr: {
    workspaceTitle: 'Frais de scolarité',
    workspaceDescription: "Définissez les frais d’inscription, la mensualité et les services par année et niveau.",
    manageServices: 'Services et frais',
    addSetup: 'Configurer les frais',
    createTitle: 'Configurer les frais',
    editTitle: 'Modifier les frais',
    viewTitle: 'Détail des frais',
    createDescription: "Choisissez les niveaux puis définissez les frais d’inscription, de scolarité et les services applicables.",
    setupInfo: 'Informations de configuration',
    setupName: 'Nom de la configuration',
    internalCode: 'Code interne',
    scopeTitle: 'Niveaux',
    itemsTitle: 'Frais et services',
    addItem: 'Ajouter un frais ou service',
    noItems: 'Aucun frais ou service pour le moment.',
    saveTemporarily: 'Enregistrer provisoirement',
    saveAndApply: 'Enregistrer et appliquer',
    listSetup: 'Configuration',
    listItems: 'Frais et services',
    listTotal: 'Total',
    confirm: 'Appliquer',
    confirmMessage: 'Rendre ces frais disponibles pour les élèves ?',
    emptyTitle: 'Aucun frais de scolarité configuré',
    emptyDescription: "Commencez par définir l’inscription, la mensualité et les services par niveau.",
    noMatchTitle: 'Aucun frais correspondant',
    noMatchDescription: 'Modifiez la recherche ou les filtres pour afficher d’autres configurations.',
    metrics: {
      total: 'Toutes les configurations',
      confirmed: 'Prêtes à appliquer',
      draft: 'Incomplètes',
      archived: 'Archivées',
    },
  },
  en: {
    workspaceTitle: 'School fees',
    workspaceDescription: 'Set registration fees, monthly tuition and services by academic year and level.',
    manageServices: 'Services and fees',
    addSetup: 'Set up fees',
    createTitle: 'Set up fees',
    editTitle: 'Edit fees',
    viewTitle: 'Fee details',
    createDescription: 'Choose the levels, then set registration, tuition and applicable services.',
    setupInfo: 'Setup details',
    setupName: 'Setup name',
    internalCode: 'Internal code',
    scopeTitle: 'Levels',
    itemsTitle: 'Fees and services',
    addItem: 'Add fee or service',
    noItems: 'No fees or services yet.',
    saveTemporarily: 'Save for later',
    saveAndApply: 'Save and apply',
    listSetup: 'Setup',
    listItems: 'Fees and services',
    listTotal: 'Total',
    confirm: 'Apply',
    confirmMessage: 'Make these fees available to apply to students?',
    emptyTitle: 'School fees are not set up yet',
    emptyDescription: 'Start with registration, monthly tuition and services for each level.',
    noMatchTitle: 'No matching fees',
    noMatchDescription: 'Change the search or filters to view other fee setups.',
    metrics: {
      total: 'All setups',
      confirmed: 'Ready to apply',
      draft: 'Incomplete',
      archived: 'Archived',
    },
  },
  es: {
    workspaceTitle: 'Cuotas escolares',
    workspaceDescription: 'Define matrícula, mensualidad y servicios por curso académico y nivel.',
    manageServices: 'Servicios y cuotas',
    addSetup: 'Configurar cuotas',
    createTitle: 'Configurar cuotas',
    editTitle: 'Editar cuotas',
    viewTitle: 'Detalle de cuotas',
    createDescription: 'Elige los niveles y define matrícula, escolaridad y servicios aplicables.',
    setupInfo: 'Datos de configuración',
    setupName: 'Nombre de la configuración',
    internalCode: 'Código interno',
    scopeTitle: 'Niveles',
    itemsTitle: 'Cuotas y servicios',
    addItem: 'Añadir cuota o servicio',
    noItems: 'Aún no hay cuotas ni servicios.',
    saveTemporarily: 'Guardar temporalmente',
    saveAndApply: 'Guardar y aplicar',
    listSetup: 'Configuración',
    listItems: 'Cuotas y servicios',
    listTotal: 'Total',
    confirm: 'Aplicar',
    confirmMessage: '¿Dejar estas cuotas disponibles para aplicarlas a alumnos?',
    emptyTitle: 'Aún no se han configurado cuotas escolares',
    emptyDescription: 'Empieza por matrícula, mensualidad y servicios para cada nivel.',
    noMatchTitle: 'No hay cuotas coincidentes',
    noMatchDescription: 'Cambia la búsqueda o los filtros para ver otras configuraciones.',
    metrics: {
      total: 'Todas las configuraciones',
      confirmed: 'Listas para aplicar',
      draft: 'Incompletas',
      archived: 'Archivadas',
    },
  },
};

export function getFeeSetupFacadeCopy(locale: Locale): FeeSetupFacadeCopy {
  return COPY[locale];
}
