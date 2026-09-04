'use client';

import { api } from '@/lib/api/client';
import type { CollectionLedgerFilters, CollectionLedgerRecord, CollectionLedgerSummary } from './collection-ledger-present';
import {
  buildCollectionLedgerAggregationsQuery,
  buildCollectionLedgerQuery,
  collectionLedgerDisplayDate,
  collectionLedgerEndpoints,
  collectionLedgerServiceSummary,
  normalizeCollectionLedgerListPayload,
  normalizeCollectionLedgerSummary,
} from './collection-ledger-present';

type LedgerExportKind = 'excel' | 'pdf';
type ExportScalar = string | number;

type LedgerExportLabels = {
  title: string;
  reference: string;
  type: string;
  student: string;
  school: string;
  academicYear: string;
  services: string;
  displayDate: string;
  originalDate: string;
  paymentMethod: string;
  amount: string;
  status: string;
  operational: string;
  historical: string;
  unavailable: string;
  operationalTotal: string;
  historicalTotal: string;
  recognizedTotal: string;
};

const EXPORT_PAGE_BATCH_SIZE = 4;

function escapeHtml(value: ExportScalar): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeFilenamePart(value: string): string {
  return value.replace(/[^0-9A-Za-z_-]+/g, '-').replace(/^-+|-+$/g, '') || 'ledger';
}

function buildPrintHtml(input: {
  labels: LedgerExportLabels;
  rows: ExportScalar[][];
  columns: string[];
  summary: Array<{ label: string; value: ExportScalar }>;
  dir: 'rtl' | 'ltr';
  lang: string;
}): string {
  const summaryHtml = input.summary
    .map(
      (item) =>
        `<div class="summary-item"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`,
    )
    .join('');
  const headers = input.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const rows = input.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td${typeof cell === 'number' ? ' class="number"' : ''}>${escapeHtml(cell)}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${escapeHtml(input.lang)}" dir="${input.dir}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.labels.title)}</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; direction: ${input.dir}; }
h1 { margin: 0 0 12px; font-size: 20px; }
.summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.summary-item { border: 1px solid #d9dee7; border-radius: 8px; padding: 8px 10px; background: #fafbfc; }
.summary-item span { display: block; font-size: 9px; color: #667085; margin-bottom: 4px; }
.summary-item strong { display: block; font-size: 12px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8px; }
th, td { border: 1px solid #d7d7d7; padding: 5px; vertical-align: top; overflow-wrap: anywhere; }
th { background: #f3f3f3; font-weight: 700; }
td.number { direction: ltr; text-align: end; font-variant-numeric: tabular-nums; }
@media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<h1>${escapeHtml(input.labels.title)}</h1>
<div class="summary">${summaryHtml}</div>
<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
</body>
</html>`;
}

async function fetchAllLedger(filters: CollectionLedgerFilters): Promise<CollectionLedgerRecord[]> {
  const firstResponse = await api.get<unknown>(
    collectionLedgerEndpoints.list,
    buildCollectionLedgerQuery({ ...filters, page: 1 }),
  );
  if (!firstResponse.success) throw new Error(firstResponse.error.code);
  const first = normalizeCollectionLedgerListPayload(firstResponse.data);
  if (!first) throw new Error('collection_ledger_export_invalid_payload');

  const totalPages = Math.max(1, firstResponse.meta.pagination?.total_pages ?? 1);
  const items = [...first.items];

  for (let start = 2; start <= totalPages; start += EXPORT_PAGE_BATCH_SIZE) {
    const pages = Array.from(
      { length: Math.min(EXPORT_PAGE_BATCH_SIZE, totalPages - start + 1) },
      (_, index) => start + index,
    );
    const responses = await Promise.all(
      pages.map((page) =>
        api.get<unknown>(
          collectionLedgerEndpoints.list,
          buildCollectionLedgerQuery({ ...filters, page }),
        ),
      ),
    );
    for (const response of responses) {
      if (!response.success) throw new Error(response.error.code);
      const payload = normalizeCollectionLedgerListPayload(response.data);
      if (!payload) throw new Error('collection_ledger_export_invalid_payload');
      items.push(...payload.items);
    }
  }

  return items;
}

async function fetchSummary(filters: CollectionLedgerFilters): Promise<CollectionLedgerSummary> {
  const response = await api.get<unknown>(
    collectionLedgerEndpoints.aggregations,
    buildCollectionLedgerAggregationsQuery(filters),
  );
  if (!response.success) throw new Error(response.error.code);
  const summary = normalizeCollectionLedgerSummary(response.data);
  if (!summary) throw new Error('collection_ledger_export_invalid_summary');
  return summary;
}

function exportRows(records: CollectionLedgerRecord[], labels: LedgerExportLabels): ExportScalar[][] {
  return records.map((record) => [
    record.reference ?? record.receipt_ref ?? record.uid,
    record.record_type === 'historical' ? labels.historical : labels.operational,
    record.student?.name ?? '',
    record.school?.name ?? '',
    record.academic_year?.name ?? '',
    collectionLedgerServiceSummary(record),
    collectionLedgerDisplayDate(record) ?? '',
    record.original_payment_date ?? labels.unavailable,
    record.record_type === 'historical'
      ? record.original_payment_method ?? labels.unavailable
      : record.payment_method ?? labels.unavailable,
    record.amount,
    record.status ?? '',
  ]);
}

function exportColumns(labels: LedgerExportLabels): string[] {
  return [
    labels.reference,
    labels.type,
    labels.student,
    labels.school,
    labels.academicYear,
    labels.services,
    labels.displayDate,
    labels.originalDate,
    labels.paymentMethod,
    labels.amount,
    labels.status,
  ];
}

function exportSummary(summary: CollectionLedgerSummary, labels: LedgerExportLabels) {
  return [
    { label: labels.operationalTotal, value: summary.operational_collected },
    { label: labels.historicalTotal, value: summary.historical_paid },
    { label: labels.recognizedTotal, value: summary.recognized_paid },
  ];
}

async function downloadExcel(input: {
  labels: LedgerExportLabels;
  rows: ExportScalar[][];
  summary: Array<{ label: string; value: ExportScalar }>;
  dir: 'rtl' | 'ltr';
  filename: string;
}) {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'Raqeem';
  const worksheet = workbook.addWorksheet('Collection Ledger');
  const columns = exportColumns(input.labels);
  const width = Math.max(1, columns.length);

  worksheet.mergeCells(1, 1, 1, width);
  const title = worksheet.getCell(1, 1);
  title.value = input.labels.title;
  title.font = { bold: true, size: 16 };
  title.alignment = { horizontal: input.dir === 'rtl' ? 'right' : 'left' };

  input.summary.forEach((item, index) => {
    const start = index * 3 + 1;
    const end = Math.min(width, start + 2);
    if (end > start) worksheet.mergeCells(3, start, 3, end);
    if (end > start) worksheet.mergeCells(4, start, 4, end);
    worksheet.getCell(3, start).value = item.label;
    worksheet.getCell(3, start).font = { bold: true, size: 9 };
    worksheet.getCell(4, start).value = item.value;
    worksheet.getCell(4, start).font = { bold: true, size: 12 };
  });

  const headerRow = worksheet.getRow(6);
  headerRow.values = columns;
  headerRow.font = { bold: true };
  for (const row of input.rows) worksheet.addRow(row);
  worksheet.views = [{ state: 'frozen', ySplit: 6, rightToLeft: input.dir === 'rtl' }];
  worksheet.columns.forEach((column) => {
    column.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${input.filename}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export async function exportCollectionLedger(input: {
  kind: LedgerExportKind;
  filters: CollectionLedgerFilters;
  labels: LedgerExportLabels;
  locale: string;
  dir: 'rtl' | 'ltr';
  popup?: Window | null;
}): Promise<void> {
  const [records, summary] = await Promise.all([
    fetchAllLedger(input.filters),
    fetchSummary(input.filters),
  ]);
  const rows = exportRows(records, input.labels);
  const summaryRows = exportSummary(summary, input.labels);
  const filename = `collection-ledger-${safeFilenamePart(input.filters.recordType)}`;

  if (input.kind === 'excel') {
    await downloadExcel({
      labels: input.labels,
      rows,
      summary: summaryRows,
      dir: input.dir,
      filename,
    });
    return;
  }

  if (!input.popup) throw new Error('collection_ledger_pdf_popup_blocked');
  input.popup.document.open();
  input.popup.document.write(
    buildPrintHtml({
      labels: input.labels,
      rows,
      columns: exportColumns(input.labels),
      summary: summaryRows,
      dir: input.dir,
      lang: input.locale,
    }),
  );
  input.popup.document.close();
  input.popup.opener = null;
  window.setTimeout(() => {
    input.popup?.focus();
    input.popup?.print();
  }, 150);
}
