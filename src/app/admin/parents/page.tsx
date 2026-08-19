'use client';

/** @raqeem-design docs/design/RAQEEM-DESIGN.md @design-status adopted */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Pagination } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import { ParentsFamilyList } from '@/features/admin/parents/components/parents-family-list';
import { ParentsListFilters } from '@/features/admin/parents/components/parents-list-filters';
import { buildAccountFilterQuery } from '@/features/admin/account/utils/account-filter-query';
import { countHiddenGuardianOnlyFamilies, filterParentFamilies, hasActiveParentFamilyFilters, type ParentFamilyFilters } from '@/features/admin/parents/utils/filter-parent-families';
import { groupParentsByFamily } from '@/features/admin/parents/utils/group-parents-by-family';
import { expandParentsWithFamilyGuardians } from '@/features/admin/parents/utils/family-guardians-context';
import { normalizeParentListItems } from '@/features/admin/parents/utils/normalize-parent-profile';
import { resolveParentsListEmptyVariant } from '@/features/admin/parents/utils/parents-list-empty';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ListParams } from '@/types/api';
import type { Parent } from '@/types/parent';
import '@/features/admin/parents/parents-list.css';

const PARENTS_PAGE_SIZE = 50;

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

  const filterState = useMemo((): ParentFamilyFilters => ({ status: statusFilter, childrenFilter, hideWithoutChildren, relationshipType: relationshipFilter, language: languageFilter }), [statusFilter, childrenFilter, hideWithoutChildren, relationshipFilter, languageFilter]);
  const accountQuery = useMemo(() => buildAccountFilterQuery(accountFilter), [accountFilter]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, accountFilter, childrenFilter, relationshipFilter, languageFilter, hideWithoutChildren]);

  const params: ListParams = { page, page_size: PARENTS_PAGE_SIZE, search: debouncedSearch.trim() || undefined, ...accountQuery };
  const state = useAdminResource<Parent[]>(endpoints.admin.parents, params);
  const pg = state.meta?.pagination;
  const hasActiveFilters = Boolean(accountFilter || hasActiveParentFamilyFilters(filterState, debouncedSearch));

  const normalizedParents = useMemo(() => {
    const normalized = normalizeParentListItems(state.data ?? []);
    return expandParentsWithFamilyGuardians(state.data ?? [], normalized);
  }, [state.data]);
  const groupedFamilies = useMemo(() => groupParentsByFamily(normalizedParents), [normalizedParents]);
  const families = useMemo(() => filterParentFamilies(groupedFamilies, filterState, debouncedSearch, { serverSearchAuthoritative: true }), [groupedFamilies, filterState, debouncedSearch]);
  const hiddenGuardianOnlyCount = useMemo(() => countHiddenGuardianOnlyFamilies(groupedFamilies, filterState, debouncedSearch), [groupedFamilies, filterState, debouncedSearch]);
  const listEmptyVariant = useMemo(() => resolveParentsListEmptyVariant({ hasActiveFilters, visibleFamilyCount: families.length, hiddenGuardianOnlyCount }), [hasActiveFilters, families.length, hiddenGuardianOnlyCount]);

  const resetFilters = useCallback(() => { setSearch(''); setStatusFilter(''); setAccountFilter(''); setChildrenFilter(''); setRelationshipFilter(''); setLanguageFilter(''); setHideWithoutChildren(true); setPage(1); }, []);
  const clearSearch = useCallback(() => { setSearch(''); setPage(1); }, []);
  const listEmptyState = listEmptyVariant === 'no-match' ? <EmptyState icon="🔍" title={t('admin.parentsList.noMatch.title')} description={t('admin.parentsList.noMatch.description')} action={<button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>{t('admin.parentsList.resetFilters')}</button>} /> : <EmptyState icon="👪" title={t('admin.parentsList.noData.title')} description={t('admin.parentsList.noData.description')} action={<Link href="/admin/parents/new" className="btn btn--primary btn--sm">{t('admin.addParent')}</Link>} />;

  return <div className="parents-list-page">
    <PageHeader title={t('nav.parents')} subtitle={pg ? t('admin.parentsList.subtitleWithCount', { total: pg.total }) : t('admin.parentsListDesc')} actions={<AdminListActions addHref="/admin/parents/new" addCapability="guardians.create" managePermission="manage_parents" exportPath={endpoints.admin.parentsExport} exportFilename="parents.csv" showImport importOpen={importOpen} onToggleImport={() => setImportOpen((v) => !v)} />} />
    {importOpen ? <CsvImportPanel importPath={endpoints.admin.parentsImport} onDone={() => state.reload()} /> : null}
    <ParentsListFilters search={search} statusFilter={statusFilter} accountFilter={accountFilter} childrenFilter={childrenFilter} relationshipFilter={relationshipFilter} languageFilter={languageFilter} hideWithoutChildren={hideWithoutChildren} hasActiveFilters={hasActiveFilters} onSearchChange={setSearch} onSearchClear={clearSearch} onStatusFilterChange={setStatusFilter} onAccountFilterChange={setAccountFilter} onChildrenFilterChange={setChildrenFilter} onRelationshipFilterChange={setRelationshipFilter} onLanguageFilterChange={setLanguageFilter} onHideWithoutChildrenChange={setHideWithoutChildren} onReset={resetFilters} />
    {state.fetching ? <p className="parents-list__fetching-hint" aria-live="polite">{t('admin.parentsList.refetching')}</p> : null}
    <ResourceView state={state} loadingLabel={t('common.loading')} isEmpty={() => !state.loading && families.length === 0} empty={listEmptyState}>
      {() => <><ParentsFamilyList families={families} />{pg ? <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} pageSize={PARENTS_PAGE_SIZE} onPage={setPage} /> : null}</>}
    </ResourceView>
  </div>;
}
