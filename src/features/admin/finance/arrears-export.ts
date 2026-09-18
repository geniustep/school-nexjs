import type { TranslateFn } from '@/features/i18n/locale-context';
import { arrearsFollowupTabApiParam } from '@/features/admin/finance/arrears-filter-contracts';
import {
  normalizeArrearsFollowupList,
  parseArrearsFollowupListResponse,
} from '@/lib/utils/normalize-arrears';
import type {
  ArrearsFollowupListItem,
  ArrearsFollowupSummary,
  ArrearsFollowupTab,
} from '@/types/finance-arrears';
import type { ListParams } from '@/types/api';

export type ArrearsExportMeta = {
  scope: 'all_filtered';
  row_count: number;
  max_rows: number;
  truncated: false;
};

export type ArrearsExportPayload = {
  items: ArrearsFollowupListItem[];
  summary: ArrearsFollowupSummary;
  appliedFilters: Record<string, unknown>;
  exportMeta: ArrearsExportMeta;
};

export function buildArrearsExportQuery(input: {
  search: string;
  tab: ArrearsFollowupTab;
  activeSchoolId: number | null;
}): ListParams {
  const tabParam = arrearsFollowupTabApiParam(input.tab);
  return {
    export: 1,
    active_school_id: input.activeSchoolId ?? undefined,
    search: input.search.trim() || undefined,
    tab: tabParam,
    quick: tabParam,
    status: tabParam,
  };
}

function numberField(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseArrearsExportPayload(
  data: unknown,
  tab: ArrearsFollowupTab,
): ArrearsExportPayload | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Record<string, unknown>;
  const meta =
    raw.export_meta && typeof raw.export_meta === 'object'
      ? (raw.export_meta as Record<string, unknown>)
      : null;
  if (!meta || meta.scope !== 'all_filtered' || meta.truncated !== false) return null;

  const rowCount = numberField(meta.row_count);
  const maxRows = numberField(meta.max_rows);
  if (rowCount == null || maxRows == null) return null;

  const items = normalizeArrearsFollowupList(raw.items);
  if (items.length !== rowCount) return null;

  const parsed = parseArrearsFollowupListResponse(raw, tab);
  return {
    items,
    summary: parsed.summary ?? {},
    appliedFilters:
      raw.applied_filters && typeof raw.applied_filters === 'object'
        ? (raw.applied_filters as Record<string, unknown>)
        : {},
    exportMeta: {
      scope: 'all_filtered',
      row_count: rowCount,
      max_rows: maxRows,
      truncated: false,
    },
  };
}

function currencyLabel(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return '';
  const row = raw as Record<string, unknown>;
  for (const key of ['code', 'name', 'symbol']) {
    if (typeof row[key] === 'string' && row[key]) return String(row[key]);
  }
  return '';
}

function displayMoney(value: number | null | undefined, currency: unknown, locale: string): string {
  if (value == null) return '—';
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  const unit = currencyLabel(currency);
  return unit ? `${amount} ${unit}` : amount;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function rowName(row: ArrearsFollowupListItem): string {
  return row.display_name ?? row.family_name ?? row.guardian_name ?? `#${row.family_id}`;
}

function safeDate(value: string | null | undefined, fallback: string): string {
  return value || fallback;
}

export async function downloadArrearsExcel(input: {
  payload: ArrearsExportPayload;
  t: TranslateFn;
  schoolName?: string | null;
  generatedAt: Date;
}): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Raqeem';
  workbook.created = input.generatedAt;
  const sheet = workbook.addWorksheet(input.t('admin.finance.arrears.export.reportTitle'), {
    views: [{ state: 'frozen', ySplit: 6 }],
  });

  sheet.addRow([input.t('admin.finance.arrears.export.reportTitle')]);
  sheet.addRow([
    input.t('admin.finance.arrears.export.school'),
    input.schoolName ?? '—',
  ]);
  sheet.addRow([
    input.t('admin.finance.arrears.export.generatedAt'),
    input.generatedAt.toISOString(),
  ]);
  sheet.addRow([
    input.t('admin.finance.arrears.export.scope'),
    input.t('admin.finance.arrears.export.scope'),
  ]);
  sheet.addRow([
    input.t('admin.finance.arrears.export.rowCount'),
    input.payload.exportMeta.row_count,
  ]);
  sheet.addRow([]);
  sheet.addRow([
    input.t('admin.finance.arrears.columns.family'),
    input.t('admin.finance.arrears.columns.studentCount'),
    input.t('admin.finance.arrears.columns.totalOverdue'),
    input.t('admin.finance.arrears.columns.totalRemaining'),
    input.t('admin.finance.arrears.columns.oldestOverdue'),
    input.t('admin.finance.arrears.columns.followupStatus'),
    input.t('admin.finance.arrears.fields.promiseDate'),
    input.t('admin.finance.arrears.fields.promiseAmount'),
    input.t('admin.finance.arrears.columns.nextFollowup'),
    input.t('admin.finance.arrears.columns.assignedUser'),
    'Currency',
  ]);

  for (const row of input.payload.items) {
    sheet.addRow([
      rowName(row),
      row.student_count ?? null,
      row.total_overdue ?? null,
      row.total_remaining ?? null,
      row.oldest_overdue_date ?? null,
      row.followup_status_label ?? row.followup_status ?? null,
      row.payment_promise_date ?? null,
      row.payment_promise_amount ?? null,
      row.next_followup_date ?? null,
      row.assigned_user_name ?? null,
      currencyLabel(row.currency),
    ]);
  }

  sheet.getRow(1).font = { bold: true, size: 16 };
  sheet.getRow(7).font = { bold: true };
  sheet.getRow(7).alignment = { vertical: 'middle' };
  [3, 4, 8].forEach((column) => {
    sheet.getColumn(column).numFmt = '#,##0.00';
  });
  sheet.columns = [
    { width: 30 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 16 },
    { width: 20 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 22 }, { width: 12 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const day = input.generatedAt.toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `raqeem-arrears-${day}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildArrearsPrintHtml(input: {
  payload: ArrearsExportPayload;
  t: TranslateFn;
  locale: string;
  dir: 'rtl' | 'ltr';
  schoolName?: string | null;
  generatedAt: Date;
}): string {
  const { payload, t } = input;
  const dash = t('common.dash');
  const summary = payload.summary;
  const generated = input.generatedAt.toLocaleString(input.locale);
  const filterText = Object.entries(payload.appliedFilters)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ') || dash;
  const currency = payload.items.find((row) => row.currency)?.currency;

  const bodyRows = payload.items.map((row) => `
      <tr>
        <td dir="auto">${escapeHtml(rowName(row))}</td>
        <td class="num">${escapeHtml(row.student_count ?? dash)}</td>
        <td class="num">${escapeHtml(displayMoney(row.total_overdue, row.currency, input.locale))}</td>
        <td class="num">${escapeHtml(displayMoney(row.total_remaining, row.currency, input.locale))}</td>
        <td class="num">${escapeHtml(safeDate(row.oldest_overdue_date, dash))}</td>
        <td dir="auto">${escapeHtml(row.followup_status_label ?? row.followup_status ?? dash)}</td>
        <td class="num">${escapeHtml(safeDate(row.payment_promise_date, dash))}</td>
        <td class="num">${escapeHtml(displayMoney(row.payment_promise_amount, row.currency, input.locale))}</td>
        <td class="num">${escapeHtml(safeDate(row.next_followup_date, dash))}</td>
        <td dir="auto">${escapeHtml(row.assigned_user_name ?? dash)}</td>
      </tr>`).join('');

  return `<!doctype html>
<html lang="${escapeHtml(input.locale)}" dir="${input.dir}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(t('admin.finance.arrears.export.reportTitle'))}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; font-size: 10px; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-block: 8px 14px; color: #475467; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-block: 10px 14px; }
  .kpi { border: 1px solid #d0d5dd; border-radius: 8px; padding: 8px; }
  .kpi span { display: block; color: #667085; font-size: 9px; margin-bottom: 4px; }
  .kpi strong { font-size: 13px; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; }
  thead { display: table-header-group; }
  th, td { border: 1px solid #d0d5dd; padding: 5px 6px; vertical-align: top; }
  th { background: #f2f4f7; font-weight: 700; }
  tr { break-inside: avoid; }
  .num { direction: ltr; unicode-bidi: isolate; white-space: nowrap; }
  .scope { margin-top: 4px; color: #667085; }
</style>
</head>
<body>
  <h1>${escapeHtml(t('admin.finance.arrears.export.reportTitle'))}</h1>
  <div class="meta">
    <span><strong>${escapeHtml(t('admin.finance.arrears.export.school'))}:</strong> ${escapeHtml(input.schoolName ?? dash)}</span>
    <span><strong>${escapeHtml(t('admin.finance.arrears.export.generatedAt'))}:</strong> ${escapeHtml(generated)}</span>
    <span><strong>${escapeHtml(t('admin.finance.arrears.export.rowCount'))}:</strong> ${payload.exportMeta.row_count}</span>
  </div>
  <div class="scope"><strong>${escapeHtml(t('admin.finance.arrears.export.filters'))}:</strong> ${escapeHtml(filterText)}</div>
  <div class="scope">${escapeHtml(t('admin.finance.arrears.export.scope'))}</div>
  <div class="kpis">
    <div class="kpi"><span>${escapeHtml(t('admin.finance.arrears.kpis.overdueFamilies'))}</span><strong>${escapeHtml(summary.overdue_families_count ?? dash)}</strong></div>
    <div class="kpi"><span>${escapeHtml(t('admin.finance.arrears.kpis.totalOverdue'))}</span><strong>${escapeHtml(summary.total_overdue_amount == null ? dash : displayMoney(summary.total_overdue_amount, currency, input.locale))}</strong></div>
    <div class="kpi"><span>${escapeHtml(t('admin.finance.arrears.kpis.paymentPromises'))}</span><strong>${escapeHtml(summary.payment_promises_count ?? dash)}</strong></div>
    <div class="kpi"><span>${escapeHtml(t('admin.finance.arrears.kpis.todayFollowups'))}</span><strong>${escapeHtml(summary.today_followups_count ?? dash)}</strong></div>
  </div>
  <table>
    <thead><tr>
      <th>${escapeHtml(t('admin.finance.arrears.columns.family'))}</th>
      <th>${escapeHtml(t('admin.finance.arrears.columns.studentCount'))}</th>
      <th>${escapeHtml(t('admin.finance.arrears.columns.totalOverdue'))}</th>
      <th>${escapeHtml(t('admin.finance.arrears.columns.totalRemaining'))}</th>
      <th>${escapeHtml(t('admin.finance.arrears.columns.oldestOverdue'))}</th>
      <th>${escapeHtml(t('admin.finance.arrears.columns.followupStatus'))}</th>
      <th>${escapeHtml(t('admin.finance.arrears.fields.promiseDate'))}</th>
      <th>${escapeHtml(t('admin.finance.arrears.fields.promiseAmount'))}</th>
      <th>${escapeHtml(t('admin.finance.arrears.columns.nextFollowup'))}</th>
      <th>${escapeHtml(t('admin.finance.arrears.columns.assignedUser'))}</th>
    </tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}

export function writeArrearsPrintWindow(
  target: Window,
  html: string,
): void {
  target.document.open();
  target.document.write(html);
  target.document.close();
  target.focus();
  target.setTimeout(() => target.print(), 100);
}
