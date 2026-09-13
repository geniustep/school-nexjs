'use client';

import { arrearsFollowupTabApiParam } from '@/features/admin/finance/arrears-filter-contracts';
import { localeToBcp47, type Locale } from '@/lib/i18n/config';
import { formatFinanceMoney, resolveFinanceCurrency } from '@/lib/i18n/format-money';
import { parseArrearsFollowupListResponse } from '@/lib/utils/normalize-arrears';
import type { ListParams } from '@/types/api';
import type {
  ArrearsFollowupListItem,
  ArrearsFollowupSummary,
  ArrearsFollowupTab,
} from '@/types/finance-arrears';

export type ArrearsExportMeta = {
  scope: string | null;
  rowCount: number | null;
  maxRows: number | null;
  truncated: boolean | null;
};

export type ArrearsExportPayload = {
  items: ArrearsFollowupListItem[];
  summary: ArrearsFollowupSummary | null;
  appliedFilters: Record<string, unknown>;
  exportMeta: ArrearsExportMeta;
};

export type ArrearsExportRow = {
  family: string;
  studentCount: number | null;
  totalOverdue: number | null;
  totalRemaining: number | null;
  oldestOverdueDate: string | null;
  followupStatus: string;
  paymentPromiseDate: string | null;
  paymentPromiseAmount: number | null;
  nextFollowupDate: string | null;
  assignedUser: string;
  currency: string;
};

export type ArrearsExportLabels = {
  excelButton: string;
  printButton: string;
  preparing: string;
  allFilteredScope: string;
  exportFailed: string;
  invalidContract: string;
  popupBlocked: string;
  reportTitle: string;
  generatedAt: string;
  scope: string;
  search: string;
  tab: string;
  all: string;
  dataSheet: string;
  metadataSheet: string;
  family: string;
  studentCount: string;
  totalOverdue: string;
  totalRemaining: string;
  oldestOverdue: string;
  followupStatus: string;
  paymentPromiseDate: string;
  paymentPromiseAmount: string;
  nextFollowup: string;
  assignedUser: string;
  currency: string;
  overdueFamilies: string;
  totalOverdueKpi: string;
  paymentPromises: string;
  todayFollowups: string;
  rowCount: string;
  academicYear: string;
};

const COPY: Record<Locale, ArrearsExportLabels> = {
  ar: {
    excelButton: 'تصدير Excel',
    printButton: 'طباعة / PDF',
    preparing: 'جارٍ إعداد كل النتائج المفلترة…',
    allFilteredScope: 'النطاق: جميع النتائج المفلترة',
    exportFailed: 'تعذر إعداد التصدير. حاول مرة أخرى.',
    invalidContract: 'تعذر التحقق من عقد التصدير الشامل؛ لم يتم إنشاء ملف جزئي.',
    popupBlocked: 'تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.',
    reportTitle: 'تقرير المتأخرات والمتابعة',
    generatedAt: 'تاريخ الإنشاء',
    scope: 'نطاق التقرير',
    search: 'البحث',
    tab: 'التصفية',
    all: 'الكل',
    dataSheet: 'المتأخرات',
    metadataSheet: 'بيانات التقرير',
    family: 'الأسرة / الحساب',
    studentCount: 'عدد التلاميذ',
    totalOverdue: 'إجمالي المتأخر',
    totalRemaining: 'إجمالي المتبقي',
    oldestOverdue: 'أقدم استحقاق متأخر',
    followupStatus: 'حالة المتابعة',
    paymentPromiseDate: 'تاريخ وعد الأداء',
    paymentPromiseAmount: 'مبلغ وعد الأداء',
    nextFollowup: 'المتابعة القادمة',
    assignedUser: 'المكلف بالمتابعة',
    currency: 'العملة',
    overdueFamilies: 'الأسر المتأخرة',
    totalOverdueKpi: 'إجمالي المتأخرات',
    paymentPromises: 'وعود الأداء',
    todayFollowups: 'متابعات اليوم',
    rowCount: 'عدد النتائج',
    academicYear: 'السنة الدراسية',
  },
  fr: {
    excelButton: 'Exporter Excel',
    printButton: 'Imprimer / PDF',
    preparing: 'Préparation de tous les résultats filtrés…',
    allFilteredScope: 'Portée : tous les résultats filtrés',
    exportFailed: "Impossible de préparer l’export. Réessayez.",
    invalidContract: "Le contrat d’export complet n’a pas pu être vérifié ; aucun export partiel n’a été créé.",
    popupBlocked: "Impossible d’ouvrir la fenêtre d’impression. Autorisez les fenêtres contextuelles puis réessayez.",
    reportTitle: 'Rapport des impayés et du suivi',
    generatedAt: 'Généré le',
    scope: 'Portée du rapport',
    search: 'Recherche',
    tab: 'Filtre',
    all: 'Tous',
    dataSheet: 'Impayés',
    metadataSheet: 'Métadonnées',
    family: 'Famille / compte',
    studentCount: "Nombre d’élèves",
    totalOverdue: 'Total en retard',
    totalRemaining: 'Total restant',
    oldestOverdue: 'Plus ancienne échéance',
    followupStatus: 'Statut du suivi',
    paymentPromiseDate: 'Date de promesse',
    paymentPromiseAmount: 'Montant promis',
    nextFollowup: 'Prochain suivi',
    assignedUser: 'Responsable du suivi',
    currency: 'Devise',
    overdueFamilies: 'Familles en retard',
    totalOverdueKpi: 'Total des impayés',
    paymentPromises: 'Promesses de paiement',
    todayFollowups: 'Suivis du jour',
    rowCount: 'Nombre de résultats',
    academicYear: 'Année scolaire',
  },
  en: {
    excelButton: 'Export Excel',
    printButton: 'Print / PDF',
    preparing: 'Preparing all filtered results…',
    allFilteredScope: 'Scope: all filtered results',
    exportFailed: 'Could not prepare the export. Please try again.',
    invalidContract: 'The comprehensive export contract could not be verified; no partial export was created.',
    popupBlocked: 'Could not open the print window. Allow pop-ups and try again.',
    reportTitle: 'Arrears and follow-up report',
    generatedAt: 'Generated at',
    scope: 'Report scope',
    search: 'Search',
    tab: 'Filter',
    all: 'All',
    dataSheet: 'Arrears',
    metadataSheet: 'Report metadata',
    family: 'Family / account',
    studentCount: 'Students',
    totalOverdue: 'Total overdue',
    totalRemaining: 'Total remaining',
    oldestOverdue: 'Oldest overdue date',
    followupStatus: 'Follow-up status',
    paymentPromiseDate: 'Promise date',
    paymentPromiseAmount: 'Promise amount',
    nextFollowup: 'Next follow-up',
    assignedUser: 'Assigned user',
    currency: 'Currency',
    overdueFamilies: 'Overdue families',
    totalOverdueKpi: 'Total overdue',
    paymentPromises: 'Payment promises',
    todayFollowups: 'Today follow-ups',
    rowCount: 'Result count',
    academicYear: 'Academic year',
  },
  es: {
    excelButton: 'Exportar Excel',
    printButton: 'Imprimir / PDF',
    preparing: 'Preparando todos los resultados filtrados…',
    allFilteredScope: 'Alcance: todos los resultados filtrados',
    exportFailed: 'No se pudo preparar la exportación. Inténtelo de nuevo.',
    invalidContract: 'No se pudo verificar el contrato de exportación completa; no se creó una exportación parcial.',
    popupBlocked: 'No se pudo abrir la ventana de impresión. Permita las ventanas emergentes y vuelva a intentarlo.',
    reportTitle: 'Informe de atrasos y seguimiento',
    generatedAt: 'Generado el',
    scope: 'Alcance del informe',
    search: 'Búsqueda',
    tab: 'Filtro',
    all: 'Todos',
    dataSheet: 'Atrasos',
    metadataSheet: 'Metadatos',
    family: 'Familia / cuenta',
    studentCount: 'Alumnos',
    totalOverdue: 'Total vencido',
    totalRemaining: 'Total restante',
    oldestOverdue: 'Vencimiento más antiguo',
    followupStatus: 'Estado del seguimiento',
    paymentPromiseDate: 'Fecha de promesa',
    paymentPromiseAmount: 'Importe prometido',
    nextFollowup: 'Próximo seguimiento',
    assignedUser: 'Responsable',
    currency: 'Moneda',
    overdueFamilies: 'Familias con atrasos',
    totalOverdueKpi: 'Total de atrasos',
    paymentPromises: 'Promesas de pago',
    todayFollowups: 'Seguimientos de hoy',
    rowCount: 'Número de resultados',
    academicYear: 'Año académico',
  },
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function arrearsExportLabels(locale: Locale): ArrearsExportLabels {
  return COPY[locale];
}

export function buildArrearsExportQuery(
  search: string,
  tab: ArrearsFollowupTab,
): ListParams {
  const tabParam = arrearsFollowupTabApiParam(tab);
  return {
    export: 1,
    search: search || undefined,
    tab: tabParam,
    quick: tabParam,
    status: tabParam,
  };
}

export function parseArrearsExportPayload(data: unknown): ArrearsExportPayload | null {
  const root = readRecord(data);
  if (!root) return null;

  const parsed = parseArrearsFollowupListResponse(root);
  const meta = readRecord(root.export_meta);
  const applied = readRecord(root.applied_filters) ?? {};
  const hasBackendSummary = readRecord(root.summary) != null;

  return {
    items: parsed.items,
    summary: hasBackendSummary ? parsed.summary : null,
    appliedFilters: applied,
    exportMeta: {
      scope: readString(meta?.scope),
      rowCount: readNumber(meta?.row_count),
      maxRows: readNumber(meta?.max_rows),
      truncated: readBoolean(meta?.truncated),
    },
  };
}

export function isTrustedComprehensiveArrearsExport(
  payload: ArrearsExportPayload | null,
): payload is ArrearsExportPayload {
  return !!(
    payload &&
    payload.exportMeta.scope === 'all_filtered' &&
    payload.exportMeta.truncated === false &&
    payload.exportMeta.rowCount === payload.items.length
  );
}

function displayName(row: ArrearsFollowupListItem): string {
  return row.display_name ?? row.family_name ?? row.guardian_name ?? `#${row.family_id}`;
}

export function buildArrearsExportRows(payload: ArrearsExportPayload): ArrearsExportRow[] {
  return payload.items.map((row) => ({
    family: displayName(row),
    studentCount: row.student_count ?? null,
    totalOverdue: row.total_overdue ?? null,
    totalRemaining: row.total_remaining ?? null,
    oldestOverdueDate: row.oldest_overdue_date ?? null,
    followupStatus: row.followup_status_label ?? row.followup_status ?? '',
    paymentPromiseDate: row.payment_promise_date ?? null,
    paymentPromiseAmount: row.payment_promise_amount ?? null,
    nextFollowupDate: row.next_followup_date ?? null,
    assignedUser: row.assigned_user_name ?? '',
    currency: resolveFinanceCurrency(row.currency),
  }));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportFilename(prefix: string, now: Date): string {
  return `${prefix}-${now.toISOString().slice(0, 10)}`;
}

export async function downloadArrearsExcel(
  payload: ArrearsExportPayload,
  locale: Locale,
  labels: ArrearsExportLabels,
  now = new Date(),
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Raqeem';
  workbook.created = now;

  const metadata = workbook.addWorksheet(labels.metadataSheet);
  metadata.addRows([
    [labels.reportTitle, ''],
    [labels.generatedAt, now.toLocaleString(localeToBcp47(locale))],
    [labels.scope, labels.allFilteredScope],
    [labels.rowCount, payload.exportMeta.rowCount ?? payload.items.length],
    [labels.search, readString(payload.appliedFilters.search) ?? labels.all],
    [labels.tab, readString(payload.appliedFilters.tab) ?? labels.all],
    [labels.academicYear, readNumber(payload.appliedFilters.academic_year_id) ?? '—'],
    ['', ''],
    [labels.overdueFamilies, payload.summary?.overdue_families_count ?? '—'],
    [labels.totalOverdueKpi, payload.summary?.total_overdue_amount ?? '—'],
    [labels.paymentPromises, payload.summary?.payment_promises_count ?? '—'],
    [labels.todayFollowups, payload.summary?.today_followups_count ?? '—'],
  ]);
  metadata.getColumn(1).width = 28;
  metadata.getColumn(2).width = 42;
  metadata.getRow(1).font = { bold: true, size: 14 };

  const sheet = workbook.addWorksheet(labels.dataSheet, {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: locale === 'ar' }],
  });
  sheet.columns = [
    { header: labels.family, key: 'family', width: 30 },
    { header: labels.studentCount, key: 'studentCount', width: 14 },
    { header: labels.totalOverdue, key: 'totalOverdue', width: 18 },
    { header: labels.totalRemaining, key: 'totalRemaining', width: 18 },
    { header: labels.oldestOverdue, key: 'oldestOverdueDate', width: 20 },
    { header: labels.followupStatus, key: 'followupStatus', width: 20 },
    { header: labels.paymentPromiseDate, key: 'paymentPromiseDate', width: 18 },
    { header: labels.paymentPromiseAmount, key: 'paymentPromiseAmount', width: 18 },
    { header: labels.nextFollowup, key: 'nextFollowupDate', width: 18 },
    { header: labels.assignedUser, key: 'assignedUser', width: 24 },
    { header: labels.currency, key: 'currency', width: 12 },
  ];

  const rows = buildArrearsExportRows(payload);
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: 'A1', to: 'K1' };
  [3, 4, 8].forEach((column) => {
    sheet.getColumn(column).numFmt = '#,##0.00';
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  downloadBlob(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${exportFilename('raqeem-arrears', now)}.xlsx`,
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatExportDate(value: string | null, locale: Locale): string {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeToBcp47(locale), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function summaryValue(value: number | undefined): string {
  return value == null || Number.isNaN(value) ? '—' : String(value);
}

export function buildArrearsPrintHtml(
  payload: ArrearsExportPayload,
  locale: Locale,
  labels: ArrearsExportLabels,
  now = new Date(),
): string {
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const rows = buildArrearsExportRows(payload);
  const currency = payload.items.find((item) => item.currency)?.currency;
  const money = (value: number | undefined | null) =>
    formatFinanceMoney(value, currency, locale);
  const generated = now.toLocaleString(localeToBcp47(locale));
  const search = readString(payload.appliedFilters.search) ?? labels.all;
  const tab = readString(payload.appliedFilters.tab) ?? labels.all;

  const tableRows = rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.family)}</td>
        <td class="num">${escapeHtml(row.studentCount ?? '—')}</td>
        <td class="money">${escapeHtml(money(row.totalOverdue))}</td>
        <td class="money">${escapeHtml(money(row.totalRemaining))}</td>
        <td>${escapeHtml(formatExportDate(row.oldestOverdueDate, locale))}</td>
        <td>${escapeHtml(row.followupStatus || '—')}</td>
        <td>${escapeHtml(formatExportDate(row.paymentPromiseDate, locale))}</td>
        <td class="money">${escapeHtml(money(row.paymentPromiseAmount))}</td>
        <td>${escapeHtml(formatExportDate(row.nextFollowupDate, locale))}</td>
        <td>${escapeHtml(row.assignedUser || '—')}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(labels.reportTitle)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Tahoma, sans-serif; color: #172033; background: #fff; }
  .report { width: 100%; }
  .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
  h1 { margin: 0 0 5px; font-size: 21px; }
  .sub { color: #5e6778; font-size: 11px; line-height: 1.7; }
  .scope { display: inline-block; border: 1px solid #ccd3df; border-radius: 999px; padding: 5px 10px; font-size: 11px; font-weight: 700; }
  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 12px 0 14px; }
  .kpi { border: 1px solid #d9dee8; border-radius: 9px; padding: 9px 10px; }
  .kpi span { display: block; color: #667085; font-size: 10px; margin-bottom: 4px; }
  .kpi strong { font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th, td { border: 1px solid #d9dee8; padding: 5px 6px; vertical-align: top; }
  th { background: #f3f5f8; font-weight: 700; text-align: start; }
  td.num, td.money { direction: ltr; text-align: end; white-space: nowrap; }
  tr { break-inside: avoid; }
  .foot { margin-top: 8px; color: #667085; font-size: 9px; }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>
  <main class="report">
    <header class="head">
      <div>
        <h1>${escapeHtml(labels.reportTitle)}</h1>
        <div class="sub">${escapeHtml(labels.generatedAt)}: ${escapeHtml(generated)}</div>
        <div class="sub">${escapeHtml(labels.search)}: ${escapeHtml(search)} · ${escapeHtml(labels.tab)}: ${escapeHtml(tab)}</div>
      </div>
      <div class="scope">${escapeHtml(labels.allFilteredScope)}</div>
    </header>
    <section class="kpis">
      <div class="kpi"><span>${escapeHtml(labels.overdueFamilies)}</span><strong>${escapeHtml(summaryValue(payload.summary?.overdue_families_count))}</strong></div>
      <div class="kpi"><span>${escapeHtml(labels.totalOverdueKpi)}</span><strong>${escapeHtml(money(payload.summary?.total_overdue_amount))}</strong></div>
      <div class="kpi"><span>${escapeHtml(labels.paymentPromises)}</span><strong>${escapeHtml(summaryValue(payload.summary?.payment_promises_count))}</strong></div>
      <div class="kpi"><span>${escapeHtml(labels.todayFollowups)}</span><strong>${escapeHtml(summaryValue(payload.summary?.today_followups_count))}</strong></div>
    </section>
    <table>
      <thead><tr>
        <th>${escapeHtml(labels.family)}</th>
        <th>${escapeHtml(labels.studentCount)}</th>
        <th>${escapeHtml(labels.totalOverdue)}</th>
        <th>${escapeHtml(labels.totalRemaining)}</th>
        <th>${escapeHtml(labels.oldestOverdue)}</th>
        <th>${escapeHtml(labels.followupStatus)}</th>
        <th>${escapeHtml(labels.paymentPromiseDate)}</th>
        <th>${escapeHtml(labels.paymentPromiseAmount)}</th>
        <th>${escapeHtml(labels.nextFollowup)}</th>
        <th>${escapeHtml(labels.assignedUser)}</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="foot">${escapeHtml(labels.rowCount)}: ${escapeHtml(payload.exportMeta.rowCount ?? rows.length)}</div>
  </main>
</body>
</html>`;
}

export function openArrearsPrintWindow(labels: ArrearsExportLabels): Window | null {
  const printWindow = window.open('', '_blank', 'popup,width=1200,height=850');
  if (!printWindow) return null;
  try {
    printWindow.opener = null;
  } catch {
    // Ignore browsers that make opener read-only.
  }
  printWindow.document.open();
  printWindow.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(labels.reportTitle)}</title></head><body><p>${escapeHtml(labels.preparing)}</p></body></html>`,
  );
  printWindow.document.close();
  return printWindow;
}

export function printArrearsReport(
  printWindow: Window,
  payload: ArrearsExportPayload,
  locale: Locale,
  labels: ArrearsExportLabels,
  now = new Date(),
): void {
  printWindow.document.open();
  printWindow.document.write(buildArrearsPrintHtml(payload, locale, labels, now));
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 120);
}
