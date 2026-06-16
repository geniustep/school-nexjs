'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { EmptyState } from '@/components/states/states';
import { ResourceView } from '@/components/states/resource';
import { FinanceFeeTypeForm } from '@/features/admin/finance/fee-type-form';
import { FeeTypesList } from '@/features/admin/finance/fee-types/fee-types-list';
import { FeeTypesListSkeleton } from '@/features/admin/finance/fee-types/fee-type-skeleton';
import {
  feeTypeActiveQueryParam,
  parseFeeTypeActiveFilter,
  type FeeTypeActiveFilter,
} from '@/features/admin/finance/fee-types/normalize-fee-type';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { canManageFeeCatalog } from '@/lib/permissions/finance';
import { useSession } from '@/features/auth/session-context';
import type { FeeType } from '@/types/finance';
import type { ListParams } from '@/types/api';
import '@/features/admin/finance/fee-types/fee-type-ui.css';

export interface FeeTypesCatalogFilters {
  search: string;
  active: FeeTypeActiveFilter;
  page: number;
  page_size: number;
}

const DEFAULT_FILTERS: FeeTypesCatalogFilters = {
  search: '',
  active: 'active',
  page: 1,
  page_size: 20,
};

export function FeeTypesCatalogDrawer({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const t = useT();
  const user = useSession();
  const canManage = canManageFeeCatalog(user);
  const [filters, setFilters] = useState<FeeTypesCatalogFilters>(DEFAULT_FILTERS);
  const [draftSearch, setDraftSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const params: ListParams = useMemo(
    () => ({
      page: filters.page,
      page_size: filters.page_size,
      search: filters.search || undefined,
      active: feeTypeActiveQueryParam(filters.active),
    }),
    [filters],
  );

  const state = useAdminResource<FeeType[]>(open ? endpoints.admin.financeFeeTypes : null, params);
  const pg = state.meta?.pagination;

  useEffect(() => {
    if (!open) {
      setFilters(DEFAULT_FILTERS);
      setDraftSearch('');
      setShowCreateForm(false);
    }
  }, [open]);

  useEffect(() => {
    setDraftSearch(filters.search);
  }, [filters.search]);

  const patchFilters = useCallback((updates: Partial<FeeTypesCatalogFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const hasActiveFilters = Boolean(filters.search || filters.active !== 'active');

  function reloadAll() {
    state.reload();
    onChanged?.();
  }

  return (
    <SetupDrawer
      open={open}
      title={t('admin.finance.feePlansWorkspace.manageFeeTypes')}
      onClose={onClose}
      size="wide"
    >
      <div className="fee-types-catalog-drawer">
        <p className="muted fee-types-catalog-drawer__desc">
          {t('admin.finance.feePlansWorkspace.manageFeeTypesDesc')}
        </p>

        {canManage ? (
          <div className="fee-types-catalog-drawer__toolbar row">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? t('common.cancel') : t('admin.finance.feePlansWorkspace.createFeeType')}
            </button>
          </div>
        ) : null}

        {showCreateForm && canManage ? (
          <FinanceFeeTypeForm
            compact
            onDone={() => {
              setShowCreateForm(false);
              reloadAll();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        ) : null}

        <div className="fee-types-toolbar toolbar">
          <form
            className="fee-types-toolbar__search"
            onSubmit={(e) => {
              e.preventDefault();
              patchFilters({ search: draftSearch.trim(), page: 1 });
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
                onClick={() => patchFilters({ active: value, page: 1 })}
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
                      patchFilters({ search: '', active: 'active', page: 1 });
                    }}
                  >
                    {t('admin.finance.feePlansWorkspace.clearFilters')}
                  </button>
                }
              />
            ) : (
              <EmptyState title={t('admin.finance.feePlansWorkspace.noFeeTypes')} />
            )
          }
        >
          {(rows) => (
            <FeeTypesList
              embedded
              rows={rows}
              pagination={
                pg ? { page: pg.page, total_pages: pg.total_pages, total: pg.total } : undefined
              }
              listReturnTo="/admin/finance/fee-plans"
              onView={() => {}}
              onPage={(page) => patchFilters({ page })}
              onReload={reloadAll}
              onDeleted={reloadAll}
            />
          )}
        </ResourceView>
      </div>
    </SetupDrawer>
  );
}
