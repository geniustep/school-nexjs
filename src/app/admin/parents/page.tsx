'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Pagination } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { ParentsFamilyList } from '@/features/admin/parents/components/parents-family-list';
import {
  filterParentFamilies,
  hasActiveParentFamilyFilters,
  type ParentFamilyFilters,
} from '@/features/admin/parents/utils/filter-parent-families';
import { groupParentsByFamily } from '@/features/admin/parents/utils/group-parents-by-family';
import { normalizeParentListItems } from '@/features/admin/parents/utils/normalize-parent-profile';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import {
  RELATIONSHIP_TYPE_CODES,
  relationshipTypeLabel,
} from '@/features/admin/students/utils/relationship-types';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ListParams } from '@/types/api';
import type { Parent } from '@/types/parent';
import '@/features/admin/parents/parents-list.css';

export default function AdminParentsPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [childrenFilter, setChildrenFilter] = useState<ParentFamilyFilters['childrenFilter']>('');
  const [relationshipFilter, setRelationshipFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [hideWithoutChildren, setHideWithoutChildren] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    statusFilter,
    accountFilter,
    childrenFilter,
    relationshipFilter,
    languageFilter,
    hideWithoutChildren,
  ]);

  const params: ListParams = {
    page,
    page_size: 50,
    search: debouncedSearch.trim() || undefined,
    status: statusFilter || undefined,
    has_account:
      accountFilter === 'has_account'
        ? 'true'
        : accountFilter === 'no_account'
          ? 'false'
          : undefined,
  };

  const state = useAdminResource<Parent[]>(endpoints.admin.parents, params);
  const pg = state.meta?.pagination;

  const hasActiveFilters = hasActiveParentFamilyFilters(
    {
      status: statusFilter,
      accountFilter,
      childrenFilter,
      hideWithoutChildren,
      relationshipType: relationshipFilter,
      language: languageFilter,
    },
    debouncedSearch,
  );

  const normalizedParents = useMemo(
    () => normalizeParentListItems(state.data ?? []),
    [state.data],
  );

  const families = useMemo(() => {
    const grouped = groupParentsByFamily(normalizedParents);
    return filterParentFamilies(
      grouped,
      {
        status: statusFilter,
        accountFilter,
        childrenFilter,
        hideWithoutChildren,
        relationshipType: relationshipFilter,
        language: languageFilter,
      },
      debouncedSearch,
    );
  }, [
    normalizedParents,
    debouncedSearch,
    statusFilter,
    accountFilter,
    childrenFilter,
    hideWithoutChildren,
    relationshipFilter,
    languageFilter,
  ]);

  function resetFilters() {
    setSearch('');
    setStatusFilter('');
    setAccountFilter('');
    setChildrenFilter('');
    setRelationshipFilter('');
    setLanguageFilter('');
    setHideWithoutChildren(true);
    setPage(1);
  }

  return (
    <div className="parents-list-page">
      <PageHeader
        title={t('nav.parents')}
        subtitle={
          pg
            ? t('admin.parentsList.subtitleWithCount', { total: pg.total })
            : t('admin.parentsListDesc')
        }
        actions={
          <AdminListActions
            addHref="/admin/parents/new"
            addCapability="guardians.create"
            managePermission="manage_parents"
            exportPath={endpoints.admin.parentsExport}
            exportFilename="parents.csv"
            showImport
            importOpen={importOpen}
            onToggleImport={() => setImportOpen((v) => !v)}
          />
        }
      />

      {importOpen ? (
        <CsvImportPanel importPath={endpoints.admin.parentsImport} onDone={() => state.reload()} />
      ) : null}

      <div className="parents-list__toolbar">
        <input
          className="input parents-list__search"
          placeholder={t('admin.searchParents')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('admin.searchParents')}
        />
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label={t('academic.status')}
        >
          <option value="">{t('admin.allStates')}</option>
          <option value="active">{t('states.active')}</option>
          <option value="suspended">{t('states.suspended')}</option>
        </select>
        <select
          className="input"
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          aria-label={t('admin.account.filterAll')}
        >
          <option value="">{t('admin.account.filterAll')}</option>
          <option value="has_account">{t('admin.account.filterHasAccount')}</option>
          <option value="no_account">{t('admin.account.filterNoAccount')}</option>
        </select>
        <select
          className="input"
          value={childrenFilter}
          onChange={(e) => setChildrenFilter(e.target.value as ParentFamilyFilters['childrenFilter'])}
          aria-label={t('admin.parentsList.filterChildren')}
        >
          <option value="">{t('admin.parentsList.filterChildrenAll')}</option>
          <option value="has">{t('admin.parentsList.filterChildrenLinked')}</option>
          <option value="none">{t('admin.parentsList.filterChildrenNone')}</option>
        </select>
        <select
          className="input"
          value={relationshipFilter}
          onChange={(e) => setRelationshipFilter(e.target.value)}
          aria-label={t('admin.parentsList.filterRelationship')}
        >
          <option value="">{t('admin.parentsList.filterRelationshipAll')}</option>
          {RELATIONSHIP_TYPE_CODES.map((type) => (
            <option key={type} value={type}>
              {relationshipTypeLabel(t, type)}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          aria-label={t('admin.preferredLanguage')}
        >
          <option value="">{t('admin.parentsList.filterLanguageAll')}</option>
          <option value="ar">{t('admin.parentsList.languageAr')}</option>
          <option value="fr">{t('admin.parentsList.languageFr')}</option>
          <option value="en">{t('admin.parentsList.languageEn')}</option>
        </select>
        <label className="parents-list__toggle">
          <input
            type="checkbox"
            checked={hideWithoutChildren}
            onChange={(e) => setHideWithoutChildren(e.target.checked)}
          />
          <span>{t('admin.parentsList.hideWithoutChildren')}</span>
        </label>
        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.parentsList.resetFilters')}
          </button>
        ) : null}
      </div>

      {!state.initialLoading && families.length > 0 ? (
        <p className="parents-list__results">
          {t('admin.parentsList.resultsCount', { count: families.length })}
        </p>
      ) : null}

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={() => families.length === 0}
        empty={
          <EmptyState
            icon="👪"
            title={t('empty.children')}
            description={hasActiveFilters ? t('admin.adjustSearch') : undefined}
          />
        }
      >
        {() => (
          <>
            <ParentsFamilyList families={families} />
            {pg ? (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            ) : null}
          </>
        )}
      </ResourceView>
    </div>
  );
}
