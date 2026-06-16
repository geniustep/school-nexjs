'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { FinanceFeeTypeForm } from '@/features/admin/finance/fee-type-form';
import { FeeTypesList } from '@/features/admin/finance/fee-types/fee-types-list';
import { FeeTypesListSkeleton } from '@/features/admin/finance/fee-types/fee-type-skeleton';
import {
  buildFeeTypeListPath,
  feeTypeActiveQueryParam,
  parseFeeTypeActiveFilter,
  type FeeTypeActiveFilter,
} from '@/features/admin/finance/fee-types/normalize-fee-type';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { FINANCE_VIEW, canManageFeeCatalog } from '@/lib/permissions/finance';
import { appendReturnTo } from '@/lib/utils/safe-return-url';
import { useSession } from '@/features/auth/session-context';
import type { FeeType } from '@/types/finance';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/fee-types/fee-type-ui.css';

export interface FeeTypesListFilters {
  search: string;
  active: FeeTypeActiveFilter;
  page: number;
  page_size: number;
}

function readFilters(searchParams: URLSearchParams): FeeTypesListFilters {
  const pageRaw = searchParams.get('page');
  const pageSizeRaw = searchParams.get('page_size');
  return {
    search: searchParams.get('search') ?? '',
    active: parseFeeTypeActiveFilter(searchParams.get('active')),
    page: pageRaw && /^\d+$/.test(pageRaw) ? Number(pageRaw) : 1,
    page_size: pageSizeRaw && /^\d+$/.test(pageSizeRaw) ? Number(pageSizeRaw) : 20,
  };
}

const URL_KEYS: Record<keyof FeeTypesListFilters, string> = {
  search: 'search',
  active: 'active',
  page: 'page',
  page_size: 'page_size',
};

export function FeeTypesPage() {
  const t = useT();
  const user = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [draftSearch, setDraftSearch] = useState(filters.search);
  const [showForm, setShowForm] = useState(false);

  const listReturnTo = useMemo(() => buildFeeTypeListPath(filters), [filters]);

  const params: ListParams = useMemo(
    () => ({
      page: filters.page,
      page_size: filters.page_size,
      search: filters.search || undefined,
      active: feeTypeActiveQueryParam(filters.active),
    }),
    [filters],
  );

  const state = useAdminResource<FeeType[]>(endpoints.admin.financeFeeTypes, params);
  const pg = state.meta?.pagination;
  const canManage = canManageFeeCatalog(user);

  useEffect(() => {
    setDraftSearch(filters.search);
  }, [filters.search]);

  const onFiltersChange = useCallback(
    (updates: Partial<Record<keyof FeeTypesListFilters, string | number | null>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates) as Array<
        [keyof FeeTypesListFilters, string | number | null]
      >) {
        const paramKey = URL_KEYS[key];
        if (value == null || value === '' || (key === 'page' && value === 1)) {
          params.delete(paramKey);
        } else if (key === 'active' && value === 'active') {
          params.delete(paramKey);
        } else if (key === 'page_size' && value === 20) {
          params.delete(paramKey);
        } else {
          params.set(paramKey, String(value));
        }
      }
      const qs = params.toString();
      router.replace(qs ? `/admin/finance/fee-types?${qs}` : '/admin/finance/fee-types');
    },
    [router, searchParams],
  );

  const hasActiveFilters = Boolean(filters.search || filters.active !== 'active');

  function onView(row: FeeType) {
    router.push(appendReturnTo(`/admin/finance/fee-types/${row.id}`, listReturnTo));
  }

  return (
    <RequireAdminPermission permission={FINANCE_VIEW}>
      <Link href="/admin/finance" className="back-link">
        ‹ {t('admin.finance.backToFinance')}
      </Link>
      <PageHeader
        title={t('admin.finance.feeTypesTitle')}
        subtitle={t('admin.finance.feeTypesDesc')}
        actions={
          canManage ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowForm((v) => !v)}>
              {showForm ? t('common.cancel') : t('admin.finance.addFeeType')}
            </button>
          ) : undefined
        }
      />

      {showForm && canManage ? (
        <FinanceFeeTypeForm
          onDone={() => {
            setShowForm(false);
            state.reload();
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      <div className="fee-types-toolbar toolbar">
        <form
          className="fee-types-toolbar__search"
          onSubmit={(e) => {
            e.preventDefault();
            onFiltersChange({ search: draftSearch.trim() || null, page: 1 });
          }}
        >
          <input
            className="input"
            placeholder={t('admin.finance.searchFeeTypes')}
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
          />
          <button type="submit" className="btn btn--ghost btn--sm">
            {t('admin.search')}
          </button>
        </form>

        <div className="fee-types-toolbar__filters" role="group" aria-label={t('academic.status')}>
          {(['active', 'archived', 'all'] as FeeTypeActiveFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              className={`btn btn--ghost btn--sm${filters.active === value ? ' is-active' : ''}`}
              aria-pressed={filters.active === value}
              onClick={() => onFiltersChange({ active: value, page: 1 })}
            >
              {t(`admin.finance.feeTypesWorkspace.filters.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        loadingFallback={<FeeTypesListSkeleton />}
        isEmpty={(rows) => rows.length === 0}
        empty={
          hasActiveFilters ? (
            <EmptyState
              title={t('admin.finance.feeTypesWorkspace.emptyFiltered')}
              action={
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setDraftSearch('');
                    onFiltersChange({ search: null, active: 'active', page: 1 });
                  }}
                >
                  {t('admin.finance.feePlansWorkspace.clearFilters')}
                </button>
              }
            />
          ) : (
            <EmptyState title={t('admin.finance.noFeeTypes')} />
          )
        }
      >
        {(rows) => (
          <FeeTypesList
            rows={rows}
            pagination={
              pg
                ? { page: pg.page, total_pages: pg.total_pages, total: pg.total }
                : undefined
            }
            listReturnTo={listReturnTo}
            embedded={false}
            onView={onView}
            onPage={(page) => onFiltersChange({ page })}
            onReload={() => state.reload()}
            onDeleted={() => state.reload()}
          />
        )}
      </ResourceView>
    </RequireAdminPermission>
  );
}
