import ExcelJS from 'exceljs';
import { arrearsFollowupTabApiParam } from '@/features/admin/finance/arrears-filter-contracts';
import { arrearsReferenceLabel } from '@/features/admin/finance/utils/arrears-family-detail-present';
import { parseArrearsFollowupListResponse } from '@/lib/utils/normalize-arrears';
import type { Locale } from '@/lib/i18n/config';
import type { ListParams } from '@/types/api';
import type {
  ArrearsFollowupListItem,
  ArrearsFollowupSummary,
  ArrearsFollowupTab,
  ArrearsListFilters,
  ArrearsOverdueInstallmentDetail,
} from '@/types/finance-arrears';

export type ArrearsExportMeta = {
  scope: 'all_filtered';
  row_count: number;
  max_rows: number;
  truncated: false;
};

export type ArrearsExportResult = {
  items: ArrearsFollowupListItem[];
  summary: ArrearsFollowupSummary;
  appliedFilters: Record<string, unknown>;
  exportMeta: ArrearsExportMeta;
};

export type ArrearsExportContext = {
  locale: Locale;
  generatedAt: Date;
  schoolName?: string | null;
  search?: string;
  tabLabel: string;
};

type ArrearsExportCopy = {
  excelAction: string;
  printAction: string;
  preparingExcel: string;
  preparingPrint: string;
  empty: string;
  failed: string;
  forbidden: string;
  limitExceeded: string;
  popupBlocked: string;
  malformed: string;
  title: string;
  generatedOn: string;
  school: string;
  filters: string;
  search: string;
  tab: string;
  allFilteredScope: string;
  resultCount: string;
  kpis: {
    overdueFamilies: string;
    totalOverdue: string;
    actionableAccounts: string;
    actionableTotal: string;
    pendingChequeCoverage: string;
    grossOverdue: string;
    paymentPromises: string;
    todayFollowups: string;
  };
  compactColumns: {
    guardian: string;
    phones: string;
    students: string;
    services: string;
    studentOverdue: string;
    total: string;
  };
  columns: {
    family: string;
    studentCount: string;
    totalOverdue: string;
    actionableOverdue: string;
    pendingChequeCoverage: string;
    grossOverdue: string;
    totalRemaining: string;
    oldestOverdue: string;
    followupStatus: string;
    promiseDate: string;
    promiseAmount: string;
    nextFollowup: string;
    assignedUser: string;
    currency: string;
  };
};

const COPY: Record<Locale, ArrearsExportCopy> = {
  ar: {
    excelAction: 'تصدير Excel',
    printAction: 'طباعة / PDF',
    preparingExcel: 'جارٍ إعداد ملف Excel…',
    preparingPrint: 'جارٍ إعداد التقرير للطباعة…',
    empty: 'لا توجد نتائج مطابقة للفلاتر الحالية لتصديرها.',
    failed: 'تعذر إعداد التصدير. أعد المحاولة.',
    forbidden: 'لا تملك صلاحية تصدير هذه البيانات.',
    limitExceeded: 'عدد النتائج كبير جدًا للتصدير دفعة واحدة. يرجى تضييق الفلاتر ثم المحاولة مجددًا.',
    popupBlocked: 'تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.',
    malformed: 'تعذر التحقق من بيانات التصدير القادمة من الخادم.',
    title: 'تقرير المتأخرات',
    generatedOn: 'تاريخ الإنشاء',
    school: 'المؤسسة',
    filters: 'الفلاتر',
    search: 'البحث',
    tab: 'الحالة',
    allFilteredScope: 'جميع النتائج المطابقة للفلاتر',
    resultCount: 'عدد النتائج',
    kpis: {
      overdueFamilies: 'الأسر المتأخرة',
      totalOverdue: 'إجمالي المتأخرات',
      actionableAccounts: 'الحسابات المطلوب متابعتها',
      actionableTotal: 'المطلوب تحصيله الآن',
      pendingChequeCoverage: 'شيكات قيد التحصيل على المتأخرات',
      grossOverdue: 'إجمالي المتأخر قبل الشيكات',
      paymentPromises: 'وعود الأداء',
      todayFollowups: 'متابعات اليوم',
    },
    compactColumns: {
      guardian: 'ولي الحساب',
      phones: 'الهواتف',
      students: 'التلاميذ والمستويات',
      services: 'غير المؤدى حسب الشهر',
      studentOverdue: 'متأخر التلاميذ',
      total: 'الإجمالي',
    },
    columns: {
      family: 'الأسرة / الحساب',
      studentCount: 'عدد التلاميذ',
      totalOverdue: 'إجمالي المتأخر',
      actionableOverdue: 'المطلوب الآن',
      pendingChequeCoverage: 'شيك قيد التحصيل',
      grossOverdue: 'المتأخر الأصلي',
      totalRemaining: 'إجمالي المتبقي',
      oldestOverdue: 'أقدم استحقاق متأخر',
      followupStatus: 'حالة المتابعة',
      promiseDate: 'تاريخ وعد الأداء',
      promiseAmount: 'مبلغ وعد الأداء',
      nextFollowup: 'المتابعة القادمة',
      assignedUser: 'المسؤول',
      currency: 'العملة',
    },
  },
  fr: {
    excelAction: 'Exporter Excel',
    printAction: 'Imprimer / PDF',
    preparingExcel: 'Préparation du fichier Excel…',
    preparingPrint: 'Préparation du rapport…',
    empty: 'Aucun résultat correspondant aux filtres actuels à exporter.',
    failed: "Impossible de préparer l’export. Réessayez.",
    forbidden: "Vous n’avez pas l’autorisation d’exporter ces données.",
    limitExceeded: 'Le nombre de résultats est trop élevé. Affinez les filtres puis réessayez.',
    popupBlocked: 'Impossible d’ouvrir la fenêtre d’impression. Autorisez les fenêtres contextuelles puis réessayez.',
    malformed: "Impossible de valider les données d’export renvoyées par le serveur.",
    title: 'Rapport des impayés',
    generatedOn: 'Généré le',
    school: 'Établissement',
    filters: 'Filtres',
    search: 'Recherche',
    tab: 'Statut',
    allFilteredScope: 'Tous les résultats correspondant aux filtres',
    resultCount: 'Nombre de résultats',
    kpis: {
      overdueFamilies: 'Familles en retard',
      totalOverdue: 'Total en retard',
      actionableAccounts: 'Comptes à relancer',
      actionableTotal: 'Montant à encaisser maintenant',
      pendingChequeCoverage: 'Chèques en cours sur les arriérés',
      grossOverdue: 'Arriéré brut avant chèques',
      paymentPromises: 'Promesses de paiement',
      todayFollowups: 'Relances du jour',
    },
    compactColumns: {
      guardian: 'Responsable du compte',
      phones: 'Téléphones',
      students: 'Élèves et niveaux',
      services: 'Impayés par mois',
      studentOverdue: 'Arriéré par élève',
      total: 'Total',
    },
    columns: {
      family: 'Famille / compte',
      studentCount: 'Élèves',
      totalOverdue: 'Total en retard',
      actionableOverdue: 'À encaisser maintenant',
      pendingChequeCoverage: 'Chèque en cours d’encaissement',
      grossOverdue: 'Arriéré initial',
      totalRemaining: 'Reste total',
      oldestOverdue: 'Plus ancienne échéance',
      followupStatus: 'Statut de suivi',
      promiseDate: 'Date de promesse',
      promiseAmount: 'Montant promis',
      nextFollowup: 'Prochaine relance',
      assignedUser: 'Responsable',
      currency: 'Devise',
    },
  },
  en: {
    excelAction: 'Export Excel',
    printAction: 'Print / PDF',
    preparingExcel: 'Preparing Excel file…',
    preparingPrint: 'Preparing printable report…',
    empty: 'There are no results matching the current filters to export.',
    failed: 'Could not prepare the export. Please try again.',
    forbidden: 'You do not have permission to export this data.',
    limitExceeded: 'There are too many results to export at once. Narrow the filters and try again.',
    popupBlocked: 'The print window could not be opened. Allow pop-ups and try again.',
    malformed: 'The export data returned by the server could not be validated.',
    title: 'Arrears report',
    generatedOn: 'Generated on',
    school: 'School',
    filters: 'Filters',
    search: 'Search',
    tab: 'Status',
    allFilteredScope: 'All results matching the filters',
    resultCount: 'Result count',
    kpis: {
      overdueFamilies: 'Overdue families',
      totalOverdue: 'Total overdue',
      actionableAccounts: 'Accounts requiring collection',
      actionableTotal: 'Amount to collect now',
      pendingChequeCoverage: 'Pending cheques covering arrears',
      grossOverdue: 'Gross overdue before cheques',
      paymentPromises: 'Payment promises',
      todayFollowups: 'Today follow-ups',
    },
    compactColumns: {
      guardian: 'Billing guardian',
      phones: 'Phones',
      students: 'Students and levels',
      services: 'Unpaid services by month',
      studentOverdue: 'Student arrears',
      total: 'Total',
    },
    columns: {
      family: 'Family / account',
      studentCount: 'Students',
      totalOverdue: 'Total overdue',
      actionableOverdue: 'Amount due now',
      pendingChequeCoverage: 'Cheque pending collection',
      grossOverdue: 'Original overdue',
      totalRemaining: 'Total remaining',
      oldestOverdue: 'Oldest overdue due date',
      followupStatus: 'Follow-up status',
      promiseDate: 'Promise date',
      promiseAmount: 'Promise amount',
      nextFollowup: 'Next follow-up',
      assignedUser: 'Assigned user',
      currency: 'Currency',
    },
  },
  es: {
    excelAction: 'Exportar Excel',
    printAction: 'Imprimir / PDF',
    preparingExcel: 'Preparando el archivo Excel…',
    preparingPrint: 'Preparando el informe…',
    empty: 'No hay resultados que coincidan con los filtros actuales para exportar.',
    failed: 'No se pudo preparar la exportación. Inténtelo de nuevo.',
    forbidden: 'No tiene permiso para exportar estos datos.',
    limitExceeded: 'Hay demasiados resultados para exportarlos de una vez. Ajuste los filtros e inténtelo de nuevo.',
    popupBlocked: 'No se pudo abrir la ventana de impresión. Permita las ventanas emergentes e inténtelo de nuevo.',
    malformed: 'No se pudieron validar los datos de exportación devueltos por el servidor.',
    title: 'Informe de atrasos',
    generatedOn: 'Generado el',
    school: 'Centro',
    filters: 'Filtros',
    search: 'Búsqueda',
    tab: 'Estado',
    allFilteredScope: 'Todos los resultados que coinciden con los filtros',
    resultCount: 'Número de resultados',
    kpis: {
      overdueFamilies: 'Familias con atrasos',
      totalOverdue: 'Total vencido',
      actionableAccounts: 'Cuentas que requieren cobro',
      actionableTotal: 'Importe a cobrar ahora',
      pendingChequeCoverage: 'Cheques en cobro sobre atrasos',
      grossOverdue: 'Atraso bruto antes de cheques',
      paymentPromises: 'Promesas de pago',
      todayFollowups: 'Seguimientos de hoy',
    },
    compactColumns: {
      guardian: 'Tutor de la cuenta',
      phones: 'Teléfonos',
      students: 'Alumnos y niveles',
      services: 'Impagados por mes',
      studentOverdue: 'Atraso por alumno',
      total: 'Total',
    },
    columns: {
      family: 'Familia / cuenta',
      studentCount: 'Alumnos',
      totalOverdue: 'Total vencido',
      actionableOverdue: 'A cobrar ahora',
      pendingChequeCoverage: 'Cheque en proceso de cobro',
      grossOverdue: 'Atraso original',
      totalRemaining: 'Total pendiente',
      oldestOverdue: 'Vencimiento más antiguo',
      followupStatus: 'Estado de seguimiento',
      promiseDate: 'Fecha de promesa',
      promiseAmount: 'Importe prometido',
      nextFollowup: 'Próximo seguimiento',
      assignedUser: 'Responsable',
      currency: 'Moneda',
    },
  },
};

const LOCALE_TAG: Record<Locale, string> = {
  ar: 'ar-MA',
  fr: 'fr-MA',
  en: 'en-GB',
  es: 'es-ES',
};

function readRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

function readInteger(raw: unknown): number | null {
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function readBoolean(raw: unknown): boolean | null {
  if (raw === true || raw === false) return raw;
  return null;
}

function currencyCode(raw: unknown): string | null {
  if (typeof raw === 'string' && raw.trim()) return raw.trim().toUpperCase();
  const record = readRecord(raw);
  if (!record) return null;
  for (const key of ['code', 'name', 'currency_code']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim().toUpperCase();
  }
  return null;
}

function rowLabel(row: ArrearsFollowupListItem): string {
  return row.display_name ?? row.family_name ?? row.guardian_name ?? `#${row.family_id}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], { dateStyle: 'medium' }).format(date);
}

function formatDateTime(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function formatMoney(value: number | null | undefined, currency: unknown, locale: Locale): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const code = currencyCode(currency);
  try {
    if (code && /^[A-Z]{3}$/.test(code)) {
      return new Intl.NumberFormat(LOCALE_TAG[locale], {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
      }).format(value);
    }
  } catch {
    // Fall back to a numeric display when the backend currency shape is unknown.
  }
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function filterSummary(context: ArrearsExportContext, copy: ArrearsExportCopy): string {
  const parts = [`${copy.tab}: ${context.tabLabel}`];
  const search = context.search?.trim();
  if (search) parts.push(`${copy.search}: ${search}`);
  return parts.join(' · ');
}

export function arrearsExportCopy(locale: Locale): ArrearsExportCopy {
  return COPY[locale];
}

export function buildArrearsExportQuery(input: {
  search?: string;
  tab: ArrearsFollowupTab;
  activeSchoolId?: number | null;
  useActionable?: boolean;
  includeDetails?: boolean;
  includeContacts?: boolean;
  filters?: Partial<ArrearsListFilters>;
}): ListParams {
  const source = input.filters;
  const tab = source?.tab
    ? (source.tab as ArrearsFollowupTab)
    : input.tab;
  const tabParam = arrearsFollowupTabApiParam(tab);
  return {
    export: 1,
    ...(input.includeDetails ? { include_details: 1 } : {}),
    ...(input.includeContacts ? { include_contacts: 1 } : {}),
    search: (source?.search ?? input.search)?.trim() || undefined,
    tab: tabParam,
    quick: tabParam,
    status: tabParam,
    ...(input.useActionable === false ? {} : { overdue_semantics: 'actionable' }),
    active_school_id: input.activeSchoolId ?? undefined,
    academic_year_id: source?.academicYearId || undefined,
    level_id: source?.levelId || undefined,
    class_id: source?.classId || undefined,
    workflow_status: source?.workflowStatus || undefined,
    contact_result: source?.contactResult || undefined,
    assigned_user_id: source?.assignedUserId || undefined,
    followup_due: source?.followupDue || undefined,
    pending_cheque: source?.pendingCheque || undefined,
    payment_promise: source?.paymentPromise || undefined,
    contacted: source?.contacted || undefined,
    actionable_min: source?.actionableMin || undefined,
    actionable_max: source?.actionableMax || undefined,
    oldest_age: source?.oldestAge || undefined,
    due_month: source?.dueMonth || undefined,
    fee_type_id: source?.feeTypeId || undefined,
  };
}

export function parseArrearsExportResponse(raw: unknown): ArrearsExportResult | null {
  const record = readRecord(raw);
  if (!record) return null;

  const parsed = parseArrearsFollowupListResponse(raw);
  const exportMetaRaw = readRecord(record.export_meta);
  if (!exportMetaRaw) return null;

  const scope = exportMetaRaw.scope;
  const rowCount = readInteger(exportMetaRaw.row_count);
  const maxRows = readInteger(exportMetaRaw.max_rows);
  const truncated = readBoolean(exportMetaRaw.truncated);
  if (
    scope !== 'all_filtered' ||
    rowCount == null ||
    maxRows == null ||
    maxRows <= 0 ||
    truncated !== false ||
    rowCount !== parsed.items.length
  ) {
    return null;
  }

  return {
    items: parsed.items,
    summary: parsed.summary ?? {},
    appliedFilters: readRecord(record.applied_filters) ?? {},
    exportMeta: {
      scope: 'all_filtered',
      row_count: rowCount,
      max_rows: maxRows,
      truncated: false,
    },
  };
}

function guardianPhoneLines(item: ArrearsFollowupListItem): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const guardian of item.guardians ?? []) {
    const numbers = (guardian.phones?.length ? guardian.phones : [guardian.phone])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())
      .filter((value) => {
        const key = `${guardian.guardian_id}:${value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (!numbers.length) continue;
    lines.push(`${guardian.name ?? '—'}: ${numbers.join(' / ')}`);
  }
  return lines.join('\n') || '—';
}

function billingGuardianName(item: ArrearsFollowupListItem): string {
  return (
    item.guardians?.find((guardian) => guardian.is_billing_partner)?.name ??
    rowLabel(item)
  );
}

function studentLevelLines(item: ArrearsFollowupListItem): string {
  return (item.students ?? [])
    .map((student) => `${student.student_name ?? `#${student.student_id}`} — ${arrearsReferenceLabel(student.level)}`)
    .join('\n') || '—';
}

function studentOverdueLines(item: ArrearsFollowupListItem, locale: Locale): string {
  return (item.students ?? [])
    .map((student) =>
      `${student.student_name ?? `#${student.student_id}`}: ${formatMoney(
        student.actionable_overdue_amount ?? 0,
        item.currency,
        locale,
      )}`,
    )
    .join('\n') || '—';
}

function installmentMonthKey(item: ArrearsOverdueInstallmentDetail): string {
  return String(item.period_start ?? item.due_date ?? item.period_key ?? '').slice(0, 7);
}

function monthLabel(monthKey: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return monthKey || '—';
  const date = new Date(`${monthKey}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function unpaidServicesLines(item: ArrearsFollowupListItem, locale: Locale): string {
  const months = new Map<string, Map<string, string[]>>();
  for (const installment of item.overdue_installments ?? []) {
    const month = installmentMonthKey(installment);
    const student = installment.student_name ?? `#${installment.student_id}`;
    const byStudent = months.get(month) ?? new Map<string, string[]>();
    const services = byStudent.get(student) ?? [];
    services.push(
      `${installment.fee_type_name ?? '—'} ${formatMoney(
        installment.actionable_overdue_amount ?? 0,
        item.currency,
        locale,
      )}`,
    );
    byStudent.set(student, services);
    months.set(month, byStudent);
  }

  const lines: string[] = [];
  for (const [month, byStudent] of months) {
    lines.push(monthLabel(month, locale));
    for (const [student, services] of byStudent) {
      const prefix = (item.students?.length ?? 0) > 1 ? `${student}: ` : '';
      lines.push(`${prefix}${services.join(' + ')}`);
    }
  }
  return lines.join('\n') || '—';
}

function compactRowHeight(values: string[]): number {
  const lines = Math.max(
    1,
    ...values.map((value) => String(value).split('\n').length),
  );
  return Math.min(90, Math.max(24, 16 + lines * 13));
}

export function createArrearsWorkbook(
  result: ArrearsExportResult,
  context: ArrearsExportContext,
): ExcelJS.Workbook {
  const copy = arrearsExportCopy(context.locale);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Raqeem';
  workbook.created = context.generatedAt;

  const worksheet = workbook.addWorksheet(copy.title);
  worksheet.columns = [
    { width: 25 },
    { width: 31 },
    { width: 30 },
    { width: 48 },
    { width: 30 },
    { width: 18 },
  ];

  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = copy.title;
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = {
    horizontal: context.locale === 'ar' ? 'right' : 'left',
  };

  worksheet.mergeCells('A2:C2');
  worksheet.getCell('A2').value = `${copy.school}: ${context.schoolName || '—'}`;
  worksheet.mergeCells('D2:F2');
  worksheet.getCell('D2').value = `${copy.generatedOn}: ${formatDateTime(context.generatedAt, context.locale)}`;

  worksheet.mergeCells('A3:F3');
  worksheet.getCell('A3').value = filterSummary(context, copy);
  worksheet.getCell('A3').font = { italic: true };

  worksheet.addRow([]);
  const headerRow = worksheet.addRow([
    copy.compactColumns.guardian,
    copy.compactColumns.phones,
    copy.compactColumns.students,
    copy.compactColumns.services,
    copy.compactColumns.studentOverdue,
    copy.compactColumns.total,
  ]);
  headerRow.font = { bold: true };
  headerRow.height = 28;
  headerRow.alignment = { vertical: 'middle', wrapText: true };

  worksheet.views = [{
    state: 'frozen',
    ySplit: headerRow.number,
    rightToLeft: context.locale === 'ar',
  }];
  worksheet.autoFilter = `A${headerRow.number}:F${headerRow.number}`;

  for (const item of result.items) {
    const values = [
      billingGuardianName(item),
      guardianPhoneLines(item),
      studentLevelLines(item),
      unpaidServicesLines(item, context.locale),
      studentOverdueLines(item, context.locale),
    ];
    const total = item.actionable_overdue_amount ?? item.total_overdue ?? 0;
    const row = worksheet.addRow([...values, total]);
    row.height = compactRowHeight(values);
    for (let cell = 1; cell <= 5; cell += 1) {
      row.getCell(cell).alignment = {
        vertical: 'top',
        wrapText: true,
        horizontal: context.locale === 'ar' ? 'right' : 'left',
      };
    }
    row.getCell(2).numFmt = '@';
    row.getCell(6).numFmt = '#,##0.00';
    row.getCell(6).font = { bold: true };
    row.getCell(6).alignment = { vertical: 'top' };
  }

  return workbook;
}

export async function downloadArrearsExcel(
  result: ArrearsExportResult,
  context: ArrearsExportContext,
): Promise<void> {
  const workbook = createArrearsWorkbook(result, context);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const day = context.generatedAt.toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `raqeem-arrears-${day}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildArrearsPrintHtml(
  result: ArrearsExportResult,
  context: ArrearsExportContext,
): string {
  const copy = arrearsExportCopy(context.locale);
  const dir = context.locale === 'ar' ? 'rtl' : 'ltr';
  const currency = result.items.find((item) => currencyCode(item.currency))?.currency;
  const summary = result.summary;
  const rows = result.items.map((item) => {
    const actionable = item.actionable_overdue_amount ?? item.total_overdue;
    const gross = item.gross_overdue_amount ?? item.total_overdue;
    return `
      <tr>
        <td dir="auto">${escapeHtml(rowLabel(item))}</td>
        <td class="num">${escapeHtml(item.student_count ?? '—')}</td>
        <td class="money">${escapeHtml(formatMoney(actionable, item.currency, context.locale))}</td>
        <td class="money">${escapeHtml(formatMoney(item.pending_cheque_coverage_amount, item.currency, context.locale))}</td>
        <td class="money">${escapeHtml(formatMoney(gross, item.currency, context.locale))}</td>
        <td class="money">${escapeHtml(formatMoney(item.total_remaining, item.currency, context.locale))}</td>
        <td class="date">${escapeHtml(formatDate(item.oldest_overdue_date, context.locale))}</td>
        <td dir="auto">${escapeHtml(item.followup_status_label ?? item.followup_status ?? '—')}</td>
        <td class="date">${escapeHtml(formatDate(item.payment_promise_date, context.locale))}</td>
        <td class="money">${escapeHtml(formatMoney(item.payment_promise_amount, item.currency, context.locale))}</td>
        <td class="date">${escapeHtml(formatDate(item.next_followup_date, context.locale))}</td>
        <td dir="auto">${escapeHtml(item.assigned_user_name ?? '—')}</td>
      </tr>`;
  }).join('');
  return `<!doctype html>
<html lang="${escapeHtml(context.locale)}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(copy.title)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111827; background: #fff; }
    main { width: 100%; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 18px; margin-bottom: 14px; font-size: 12px; }
    .meta strong { margin-inline-end: 6px; }
    .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 12px 0 16px; }
    .kpi { border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px; break-inside: avoid; }
    .kpi span { display: block; font-size: 10px; color: #4b5563; margin-bottom: 4px; }
    .kpi strong { font-size: 15px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8px; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #d1d5db; padding: 4px; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #f3f4f6; font-weight: 700; }
    .num, .money, .date { direction: ltr; text-align: start; unicode-bidi: isolate; white-space: nowrap; }
    .scope { margin-top: 6px; font-size: 11px; color: #4b5563; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(copy.title)}</h1>
    <div class="meta">
      <div><strong>${escapeHtml(copy.school)}:</strong> ${escapeHtml(context.schoolName || '—')}</div>
      <div><strong>${escapeHtml(copy.generatedOn)}:</strong> ${escapeHtml(formatDateTime(context.generatedAt, context.locale))}</div>
      <div><strong>${escapeHtml(copy.filters)}:</strong> ${escapeHtml(filterSummary(context, copy))}</div>
      <div><strong>${escapeHtml(copy.resultCount)}:</strong> ${escapeHtml(result.exportMeta.row_count)}</div>
    </div>
    <div class="scope">${escapeHtml(copy.allFilteredScope)}</div>
    <section class="kpis">
      <div class="kpi"><span>${escapeHtml(copy.kpis.actionableAccounts)}</span><strong>${escapeHtml(summary.actionable_overdue_accounts_count ?? summary.overdue_accounts_count ?? summary.overdue_families_count ?? '—')}</strong></div>
      <div class="kpi"><span>${escapeHtml(copy.kpis.actionableTotal)}</span><strong>${escapeHtml(formatMoney(summary.total_actionable_overdue_amount ?? summary.total_overdue_amount, currency, context.locale))}</strong></div>
      <div class="kpi"><span>${escapeHtml(copy.kpis.pendingChequeCoverage)}</span><strong>${escapeHtml(formatMoney(summary.total_pending_cheque_coverage_on_overdue, currency, context.locale))}</strong></div>
      <div class="kpi"><span>${escapeHtml(copy.kpis.grossOverdue)}</span><strong>${escapeHtml(formatMoney(summary.total_overdue_amount, currency, context.locale))}</strong></div>
      <div class="kpi"><span>${escapeHtml(copy.kpis.paymentPromises)}</span><strong>${escapeHtml(summary.payment_promises_count ?? '—')}</strong></div>
      <div class="kpi"><span>${escapeHtml(copy.kpis.todayFollowups)}</span><strong>${escapeHtml(summary.today_followups_count ?? '—')}</strong></div>
    </section>
    <table>
      <thead>
        <tr>
          <th>${escapeHtml(copy.columns.family)}</th>
          <th>${escapeHtml(copy.columns.studentCount)}</th>
          <th>${escapeHtml(copy.columns.actionableOverdue)}</th>
          <th>${escapeHtml(copy.columns.pendingChequeCoverage)}</th>
          <th>${escapeHtml(copy.columns.grossOverdue)}</th>
          <th>${escapeHtml(copy.columns.totalRemaining)}</th>
          <th>${escapeHtml(copy.columns.oldestOverdue)}</th>
          <th>${escapeHtml(copy.columns.followupStatus)}</th>
          <th>${escapeHtml(copy.columns.promiseDate)}</th>
          <th>${escapeHtml(copy.columns.promiseAmount)}</th>
          <th>${escapeHtml(copy.columns.nextFollowup)}</th>
          <th>${escapeHtml(copy.columns.assignedUser)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </main>
</body>
</html>`;
}
