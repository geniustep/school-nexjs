/**
 * Expenses V1 accounting-readiness UI copy.
 * All four Raqeem locales must stay complete: ar, fr, en, es.
 * No fallback to an unrelated language for supported locales.
 */
export const EXPENSES_READINESS_LOCALES = ['ar', 'fr', 'en', 'es'] as const;
export type ExpensesReadinessLocale = (typeof EXPENSES_READINESS_LOCALES)[number];

export type ExpensesReadinessCopy = {
  back: string;
  title: string;
  subtitle: string;
  phase: string;
  warningTitle: string;
  warningDescription: string;
  checksHeading: string;
  school: string;
  company: string;
  purchase: string;
  payment: string;
  present: string;
  absent: string;
  notChecked: string;
  loading: string;
  reload: string;
  footerHeading: string;
  footerDescription: string;
  actionsBlocked: string;
};

export const EXPENSES_READINESS_COPY: Record<ExpensesReadinessLocale, ExpensesReadinessCopy> = {
  ar: {
    back: 'العودة إلى المالية',
    title: 'المصاريف والنفقات التشغيلية',
    subtitle: 'إدارة منظمة للمصاريف، مع التحقق من جاهزية المحاسبة قبل التفعيل.',
    phase: 'مرحلة التهيئة',
    warningTitle: 'العمليات المالية غير مفعّلة حاليًا',
    warningDescription: 'هذه الصفحة تفحص متطلبات أولية فقط. لا تنشئ مصاريف أو فواتير أو أداءات.',
    checksHeading: 'فحوص التهيئة الأساسية',
    school: 'المدرسة النشطة',
    company: 'ارتباط المدرسة بالشركة',
    purchase: 'دفتر مشتريات',
    payment: 'دفتر نقد أو بنك',
    present: 'متوفر',
    absent: 'يتطلب إعدادًا',
    notChecked: 'لم يُتحقق منه',
    loading: 'جارٍ التحقق من متطلبات التهيئة…',
    reload: 'إعادة التحقق',
    footerHeading: 'ما الذي بقي قبل التفعيل؟',
    footerDescription: 'التحقق من حسابات المصاريف والدائنين، والموردين، ومراكز التكلفة، والصلاحيات، والمطابقة المحاسبية في بيئة الاختبار.',
    actionsBlocked: 'لن تتاح الموافقة أو تسجيل الأداء قبل اعتماد نتيجة تدقيق Odoo.',
  },
  fr: {
    back: 'Retour aux finances',
    title: 'Dépenses opérationnelles',
    subtitle: 'Une gestion structurée des dépenses, avec vérification comptable avant activation.',
    phase: 'Phase de préparation',
    warningTitle: 'Les opérations financières ne sont pas encore activées',
    warningDescription: 'Cette page vérifie uniquement des prérequis. Elle ne crée ni dépenses, ni factures, ni paiements.',
    checksHeading: 'Contrôles préalables',
    school: 'École active',
    company: "Lien entre l’école et la société",
    purchase: "Journal d’achats",
    payment: 'Journal de caisse ou de banque',
    present: 'Disponible',
    absent: 'Configuration requise',
    notChecked: 'Non vérifié',
    loading: 'Vérification des prérequis…',
    reload: 'Vérifier à nouveau',
    footerHeading: 'Que reste-t-il avant l’activation ?',
    footerDescription: 'Vérifier les comptes de charges et fournisseurs, les tiers, les centres de coûts, les droits d’accès et les rapprochements dans l’environnement de test.',
    actionsBlocked: 'Les approbations et paiements resteront indisponibles jusqu’à validation de l’audit Odoo.',
  },
  en: {
    back: 'Back to Finance',
    title: 'Operating expenses',
    subtitle: 'Organized expense management, with an accounting readiness check before activation.',
    phase: 'Setup stage',
    warningTitle: 'Financial operations are not enabled yet',
    warningDescription: 'This page checks prerequisites only. It does not create expenses, vendor bills, or payments.',
    checksHeading: 'Initial configuration checks',
    school: 'Active school',
    company: 'School linked to company',
    purchase: 'Purchase journal',
    payment: 'Cash or bank journal',
    present: 'Available',
    absent: 'Setup required',
    notChecked: 'Not verified',
    loading: 'Checking configuration prerequisites…',
    reload: 'Check again',
    footerHeading: 'What must be verified before activation?',
    footerDescription: 'Expense and payable accounts, vendors, cost centers, permissions, and accounting reconciliation in the test environment.',
    actionsBlocked: 'Approval and payment actions remain unavailable until the Odoo audit is approved.',
  },
  es: {
    back: 'Volver a Finanzas',
    title: 'Gastos operativos',
    subtitle: 'Gestión organizada de gastos con verificación contable previa a la activación.',
    phase: 'Etapa de configuración',
    warningTitle: 'Las operaciones financieras aún no están activadas',
    warningDescription: 'Esta página solo verifica requisitos previos. No crea gastos, facturas de proveedor ni pagos.',
    checksHeading: 'Comprobaciones iniciales',
    school: 'Centro educativo activo',
    company: 'Vinculación del centro con la empresa',
    purchase: 'Diario de compras',
    payment: 'Diario de caja o banco',
    present: 'Disponible',
    absent: 'Requiere configuración',
    notChecked: 'Sin verificar',
    loading: 'Comprobando requisitos de configuración…',
    reload: 'Volver a comprobar',
    footerHeading: '¿Qué falta antes de la activación?',
    footerDescription: 'Verificar cuentas de gastos y proveedores, terceros, centros de costes, permisos y conciliación contable en el entorno de pruebas.',
    actionsBlocked: 'Las aprobaciones y los pagos seguirán deshabilitados hasta validar la auditoría de Odoo.',
  },
};

export function expensesReadinessCopy(locale: ExpensesReadinessLocale): ExpensesReadinessCopy {
  return EXPENSES_READINESS_COPY[locale];
}
