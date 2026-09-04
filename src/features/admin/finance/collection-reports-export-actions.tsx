'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Filter-preserving exports for collection reports. Financial totals are never
 * recomputed here: summaries and row amounts come from the existing Backend
 * report contracts.
 */

import { useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useLocale, useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { paymentMethodLabel } from '@/lib/utils/finance';
import type { ListParams } from '@/types/api';
import type {
  CollectionReportAggregationRow,
  CollectionReportDetailRow,
  CollectionReportSummary,
} from '@/types/finance-collection-reports';
import {
  aggregationRowsForDimension,
  buildCollectionReportsAggregationsQuery,
  buildCollectionReportsQuery,
  displayAmountForDetailRow,
  isUnallocatedDetailRow,
  normalizeCollectionReportsAggregationsPayload,
  normalizeCollectionReportsDetailsPayload,
  primaryAggregationAmount,
  type CollectionReportsFilters,
} from '@/features/admin/finance/utils/collection-reports-present';

type ExportScalar = string | number;

type ExportModel = {
  title: string;
  filenameBase: string;
  dir: 'rtl' | 'ltr';
  lang: string;
  currency: string;
  summary: Array<{ label: string; value: ExportScalar }>;
  columns: string[];
  rows: ExportScalar[][];
};

type ExportKind = 'excel' | 'pdf';

const EXPORT_PAGE_BATCH_SIZE = 4;

function safeFilenamePart(value: string): string {
  return value.replace(/[^0-9A-Za-z_-]+/g, '-').replace(/^-+|-+$/g, '') || 'report';
}

function escapeHtml(value: ExportScalar): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatMoney(value: number, currency: string, locale: string): string {
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${amount} ${currency}` : amount;
}

function createPrintHtml(model: ExportModel): string {
  const summary = model.summary
    .map(
      (item) =>
        `<div class="summary-item"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`,
    )
    .join('');
  const headers = model.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const rows = model.rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td${typeof cell === 'number' ? ' class="number"' : ''}>${escapeHtml(cell)}</td>`)
          .join('')}</tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${escapeHtml(model.lang)}" dir="${model.dir}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(model.title)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; direction: ${model.dir}; }
    h1 { margin: 0 0 12px; font-size: 20px; }
    .summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
    .summary-item { border: 1px solid #ddd; border-radius: 6px; padding: 7px 9px; }
    .summary-item span { display: block; font-size: 9px; color: #555; margin-bottom: 3px; }
    .summary-item strong { font-size: 11px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.5px; }
    th, td { border: 1px solid #d7d7d7; padding: 5px 6px; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #f3f3f3; font-weight: 700; }
    td.number { direction: ltr; text-align: end; font-variant-numeric: tabular-nums; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(model.title)}</h1>
  <div class="summary">${summary}</div>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

async function downloadExcel(model: ExportModel): Promise<void> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'Raqeem';
  const worksheet = workbook.addWorksheet('Collections');
  const width = Math.max(1, model.columns.length);

  worksheet.mergeCells(1, 1, 1, width);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = model.title;
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: model.dir === 'rtl' ? 'right' : 'left' };

  let rowNumber = 3;
  for (const item of model.summary) {
    const row = worksheet.getRow(rowNumber++);
    row.getCell(1).value = item.label;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = item.value;
  }
  rowNumber += 1;

  const headerRow = worksheet.getRow(rowNumber++);
  headerRow.values = model.columns;
  headerRow.font = { bold: true };

  for (const values of model.rows) {
    worksheet.addRow(values);
  }

  worksheet.views = [
    {
      state: 'frozen',
      ySplit: headerRow.number,
      rightToLeft: model.dir === 'rtl',
    },
  ];

  worksheet.columns.forEach((column, index) => {
    const header = model.columns[index] ?? '';
    let maxLength = Math.max(10, String(header).length + 2);
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      maxLength = Math.min(36, Math.max(maxLength, String(cell.value ?? '').length + 2));
    });
    column.width = maxLength;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${model.filenameBase}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

function printPdf(model: ExportModel, popup: Window): void {
  popup.document.open();
  popup.document.write(createPrintHtml(model));
  popup.document.close();
  popup.opener = null;
  window.setTimeout(() => {
    popup.focus();
    popup.print();
  }, 150);
}

function reportFilename(filters: CollectionReportsFilters): string {
  const period =
    filters.dateMode === 'day'
      ? filters.date
      : `${filters.dateFrom || 'start'}_${filters.dateTo || 'end'}`;
  return `collections-${safeFilenamePart(period || 'report')}`;
}

export function CollectionReportsExportActions({ filters }: { filters: CollectionReportsFilters }) {
  const t = useT();
  const { locale, dir } = useLocale();
  const { formatDate } = useFormat();
  const { activeSchoolId, schools, requiresActiveSchool, switching } = useAdminSession();
  const [exporting, setExporting] = useState<ExportKind | null>(null);

  const safeActiveSchoolId = useMemo(
    () =>
      activeSchoolId != null && schools.some((school) => school.id === activeSchoolId)
        ? activeSchoolId
        : null,
    [activeSchoolId, schools],
  );

  const exportBlocked = switching || (requiresActiveSchool && safeActiveSchoolId == null);

  function withSchoolScope(query: ListParams): ListParams {
    return safeActiveSchoolId == null
      ? query
      : { ...query, active_school_id: safeActiveSchoolId };
  }

  async function fetchAllDetails(): Promise<{
    items: CollectionReportDetailRow[];
    summary: CollectionReportSummary;
  }> {
    const firstQuery = withSchoolScope(
      buildCollectionReportsQuery({ ...filters, page: 1 }),
    );
    const firstResponse = await api.get<unknown>(
      endpoints.admin.financeCollectionReports,
      firstQuery,
    );
    if (!firstResponse.success) throw new Error(firstResponse.error.code);
    const first = normalizeCollectionReportsDetailsPayload(firstResponse.data);
    if (!first) throw new Error('collection_reports_export_invalid_payload');

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
            endpoints.admin.financeCollectionReports,
            withSchoolScope(buildCollectionReportsQuery({ ...filters, page })),
          ),
        ),
      );

      for (const response of responses) {
        if (!response.success) throw new Error(response.error.code);
        const payload = normalizeCollectionReportsDetailsPayload(response.data);
        if (!payload) throw new Error('collection_reports_export_invalid_payload');
        items.push(...payload.items);
      }
    }

    return { items, summary: first.summary };
  }

  async function fetchAggregation(): Promise<{
    items: CollectionReportAggregationRow[];
    summary: CollectionReportSummary;
  }> {
    const response = await api.get<unknown>(
      endpoints.admin.financeCollectionReportsAggregations,
      withSchoolScope(buildCollectionReportsAggregationsQuery(filters)),
    );
    if (!response.success) throw new Error(response.error.code);
    const payload = normalizeCollectionReportsAggregationsPayload(response.data);
    if (!payload) throw new Error('collection_reports_export_invalid_payload');
    return {
      items: aggregationRowsForDimension(payload.aggregations, filters.aggDimension),
      summary: payload.summary,
    };
  }

  function summaryRows(summary: CollectionReportSummary): ExportModel['summary'] {
    const currency = summary.currency_name ?? '';
    return [
      {
        label: t('admin.finance.collectionReports.summary.total'),
        value: formatMoney(summary.total_confirmed_collections_amount, currency, locale),
      },
      {
        label: t('admin.finance.collectionReports.summary.collectionsCount'),
        value: summary.collections_count,
      },
      ...(summary.distinct_payers_count == null
        ? []
        : [
            {
              label: t('admin.finance.collectionReports.summary.payersCount'),
              value: summary.distinct_payers_count,
            },
          ]),
      {
        label: t('admin.finance.collectionReports.summary.allocated'),
        value: formatMoney(summary.allocated_amount, currency, locale),
      },
      {
        label: t('admin.finance.collectionReports.summary.unallocated'),
        value: formatMoney(summary.unallocated_amount, currency, locale),
      },
    ];
  }

  function detailModel(
    items: CollectionReportDetailRow[],
    summary: CollectionReportSummary,
  ): ExportModel {
    const currency = summary.currency_name ?? '';
    return {
      title: t('admin.finance.collectionReports.pageTitle'),
      filenameBase: reportFilename(filters),
      dir,
      lang: locale,
      currency,
      summary: summaryRows(summary),
      columns: [
        t('admin.finance.collectionReports.columns.date'),
        t('admin.finance.collectionReports.columns.student'),
        t('admin.finance.collectionReports.columns.payer'),
        t('admin.finance.collectionReports.columns.cycle'),
        t('admin.finance.collectionReports.columns.level'),
        t('admin.finance.collectionReports.columns.class'),
        t('admin.finance.collectionReports.columns.service'),
        t('admin.finance.collectionReports.columns.paymentMethod'),
        t('admin.finance.collectionReports.columns.amount'),
      ],
      rows: items.map((row) => [
        row.payment_date ? formatDate(row.payment_date) : t('common.dash'),
        isUnallocatedDetailRow(row)
          ? t('admin.finance.collectionReports.unallocatedLabel')
          : [row.student?.display_name, row.student?.code].filter(Boolean).join(' · ') ||
            t('common.dash'),
        row.payer?.display_name || row.payer?.actual_payer_name || t('common.dash'),
        isUnallocatedDetailRow(row) ? t('common.dash') : row.cycle?.display_name ?? t('common.dash'),
        isUnallocatedDetailRow(row) ? t('common.dash') : row.level?.display_name ?? t('common.dash'),
        isUnallocatedDetailRow(row) ? t('common.dash') : row.class?.display_name ?? t('common.dash'),
        isUnallocatedDetailRow(row) ? t('common.dash') : row.service?.display_name ?? t('common.dash'),
        paymentMethodLabel(row.payment_method, t),
        displayAmountForDetailRow(row),
      ]),
    };
  }

  function aggregationModel(
    items: CollectionReportAggregationRow[],
    summary: CollectionReportSummary,
  ): ExportModel {
    const currency = summary.currency_name ?? '';
    return {
      title: t('admin.finance.collectionReports.pageTitle'),
      filenameBase: `${reportFilename(filters)}-${filters.aggDimension}`,
      dir,
      lang: locale,
      currency,
      summary: summaryRows(summary),
      columns: [
        t(`admin.finance.collectionReports.agg.${filters.aggDimension}.name`),
        t('admin.finance.collectionReports.agg.collectionsCount'),
        t('admin.finance.collectionReports.agg.allocationsCount'),
        t('admin.finance.collectionReports.agg.studentsCount'),
        t('admin.finance.collectionReports.agg.payersCount'),
        filters.aggDimension === 'payment_method'
          ? t('admin.finance.collectionReports.agg.collectionsAmount')
          : t('admin.finance.collectionReports.agg.allocatedAmount'),
      ],
      rows: items.map((row) => [
        filters.aggDimension === 'payment_method'
          ? paymentMethodLabel(String(row.id ?? row.display_name ?? ''), t)
          : row.display_name || t('common.dash'),
        row.collections_count ?? t('common.dash'),
        row.allocations_count ?? t('common.dash'),
        row.distinct_students_count ?? t('common.dash'),
        row.distinct_payers_count ?? t('common.dash'),
        primaryAggregationAmount(filters.aggDimension, row),
      ]),
    };
  }

  async function buildExportModel(): Promise<ExportModel> {
    if (filters.view === 'aggregations') {
      const result = await fetchAggregation();
      return aggregationModel(result.items, result.summary);
    }
    const result = await fetchAllDetails();
    return detailModel(result.items, result.summary);
  }

  async function runExport(kind: ExportKind) {
    if (exporting || exportBlocked) return;

    const popup = kind === 'pdf' ? window.open('', '_blank', 'width=1200,height=800') : null;
    if (kind === 'pdf' && !popup) return;

    setExporting(kind);
    try {
      const model = await buildExportModel();
      if (kind === 'excel') {
        await downloadExcel(model);
      } else if (popup) {
        printPdf(model, popup);
      }
    } catch {
      popup?.close();
      window.alert(t('errors.loadFailedRetry'));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="toolbar" role="group" aria-label={t('common.download')}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={exporting != null || exportBlocked}
        onClick={() => void runExport('excel')}
        aria-label={`${t('common.download')} Excel`}
      >
        {exporting === 'excel' ? 'Excel…' : 'Excel'}
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        disabled={exporting != null || exportBlocked}
        onClick={() => void runExport('pdf')}
        aria-label={`${t('common.download')} PDF`}
      >
        {exporting === 'pdf' ? 'PDF…' : 'PDF'}
      </button>
    </div>
  );
}
