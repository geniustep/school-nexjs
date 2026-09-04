'use client';

import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { PageHeader } from '@/components/ui/primitives';
import { CollectionReportsExportActions } from '@/features/admin/finance/collection-reports-export-actions';
import { CollectionReportsOperationsPanel } from '@/features/admin/finance/collection-reports-operations-panel';
import {
  defaultCollectionReportsFilters,
  isCollectionReportAggDimension,
  isCollectionReportsView,
  type CollectionReportsFilters,
} from '@/features/admin/finance/utils/collection-reports-present';
import { useT } from '@/features/i18n/locale-context';
import { FINANCE_VIEW_PAYMENTS } from '@/lib/permissions/finance';
import '@/features/admin/finance/finance-ui.css';

const URL_KEYS: Record<keyof CollectionReportsFilters, string> = {
  dateMode: 'date_mode',
  date: 'date',
  dateFrom: 'date_from',
  dateTo: 'date_to',
  cycle: 'cycle',
  levelId: 'level_id',
  classId: 'class_id',
  serviceId: 'service_id',
  paymentMethod: 'payment_method',
  academicYearId: 'academic_year_id',
  search: 'search',
  page: 'page',
  view: 'view',
  aggDimension: 'agg',
};

function readFilters(searchParams: URLSearchParams): CollectionReportsFilters {
  const defaults = defaultCollectionReportsFilters();
  const dateModeRaw = searchParams.get('date_mode') ?? '';
  const dateMode = dateModeRaw === 'range' ? 'range' : 'day';
  const pageRaw = searchParams.get('page');
  const viewRaw = searchParams.get('view') ?? '';
  const aggRaw = searchParams.get('agg') ?? '';

  return {
    dateMode,
    date: searchParams.get('date') ?? (dateMode === 'day' ? defaults.date : ''),
    dateFrom: searchParams.get('date_from') ?? '',
    dateTo: searchParams.get('date_to') ?? '',
    cycle: searchParams.get('cycle') ?? '',
    levelId: searchParams.get('level_id') ?? '',
    classId: searchParams.get('class_id') ?? '',
    serviceId: searchParams.get('service_id') ?? '',
    paymentMethod: searchParams.get('payment_method') ?? '',
    academicYearId: searchParams.get('academic_year_id') ?? '',
    search: searchParams.get('search') ?? '',
    page: pageRaw && /^\d+$/.test(pageRaw) ? Math.max(1, Number(pageRaw)) : 1,
    view: isCollectionReportsView(viewRaw) ? viewRaw : 'details',
    aggDimension: isCollectionReportAggDimension(aggRaw) ? aggRaw : 'cycle',
  };
}

export default function AdminFinanceCollectionReportsPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const defaults = useMemo(() => defaultCollectionReportsFilters(), []);

  const onFiltersChange = useCallback(
    (updates: Partial<Record<keyof CollectionReportsFilters, string | number | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      const next: CollectionReportsFilters = { ...filters, ...updates } as CollectionReportsFilters;

      // Keep the last valid report visible and do not call the Backend with an
      // inverted date range. The operations panel surfaces the recoverable
      // validation error while Odoo remains the final validation boundary.
      if (
        next.dateMode === 'range' &&
        next.dateFrom.trim() &&
        next.dateTo.trim() &&
        next.dateFrom.trim() > next.dateTo.trim()
      ) {
        return;
      }

      for (const key of Object.keys(URL_KEYS) as Array<keyof CollectionReportsFilters>) {
        const paramKey = URL_KEYS[key];
        const value = next[key];
        const isDefault =
          (key === 'dateMode' && value === 'day') ||
          (key === 'date' && next.dateMode === 'day' && value === defaults.date) ||
          (key === 'page' && value === 1) ||
          (key === 'view' && value === 'details') ||
          (key === 'aggDimension' && value === 'cycle') ||
          value == null ||
          value === '';

        if (isDefault) {
          params.delete(paramKey);
        } else {
          params.set(paramKey, String(value));
        }
      }

      // Enforce date XOR range in the URL.
      if (next.dateMode === 'day') {
        params.delete('date_from');
        params.delete('date_to');
        if (!next.date || next.date === defaults.date) params.delete('date');
        else params.set('date', next.date);
        params.delete('date_mode');
      } else {
        params.set('date_mode', 'range');
        params.delete('date');
      }

      const qs = params.toString();
      router.replace(
        qs ? `/admin/finance/reports/collections?${qs}` : '/admin/finance/reports/collections',
      );
    },
    [defaults.date, filters, router, searchParams],
  );

  return (
    <RequireAdminPermission permission={FINANCE_VIEW_PAYMENTS}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.collectionReports.pageTitle')}
        subtitle={t('admin.finance.collectionReports.pageDesc')}
      />
      <CollectionReportsExportActions filters={filters} />
      <CollectionReportsOperationsPanel filters={filters} onFiltersChange={onFiltersChange} />
    </RequireAdminPermission>
  );
}
