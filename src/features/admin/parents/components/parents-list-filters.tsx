'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useState } from 'react';
import { ParentsListSearchField } from './parents-list-search-field';
import {
  RELATIONSHIP_TYPE_CODES,
  relationshipTypeLabel,
} from '@/features/admin/students/utils/relationship-types';
import type { ParentFamilyFilters } from '@/features/admin/parents/utils/filter-parent-families';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';

export type ParentsListFiltersState = {
  search: string;
  statusFilter: string;
  accountFilter: string;
  childrenFilter: ParentFamilyFilters['childrenFilter'];
  relationshipFilter: string;
  languageFilter: string;
  hideWithoutChildren: boolean;
};

export function ParentsListFilters({
  search,
  statusFilter,
  accountFilter,
  childrenFilter,
  relationshipFilter,
  languageFilter,
  hideWithoutChildren,
  hasActiveFilters,
  onSearchChange,
  onSearchClear,
  onStatusFilterChange,
  onAccountFilterChange,
  onChildrenFilterChange,
  onRelationshipFilterChange,
  onLanguageFilterChange,
  onHideWithoutChildrenChange,
  onReset,
}: ParentsListFiltersState & {
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onStatusFilterChange: (value: string) => void;
  onAccountFilterChange: (value: string) => void;
  onChildrenFilterChange: (value: ParentFamilyFilters['childrenFilter']) => void;
  onRelationshipFilterChange: (value: string) => void;
  onLanguageFilterChange: (value: string) => void;
  onHideWithoutChildrenChange: (value: boolean) => void;
  onReset: () => void;
}) {
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);

  const hasMoreActive = !!(
    childrenFilter ||
    relationshipFilter ||
    languageFilter ||
    hideWithoutChildren === false
  );

  useEffect(() => {
    if (!hasMoreActive) return;
    setMoreOpen(true);
  }, [hasMoreActive]);

  const hasStructuredActive = !!(
    statusFilter ||
    accountFilter ||
    childrenFilter ||
    relationshipFilter ||
    languageFilter ||
    hideWithoutChildren === false
  );

  return (
    <div className="parents-list-filters">
      <div className="parents-list-filters__primary">
        <ParentsListSearchField
          value={search}
          onChange={onSearchChange}
          onClear={onSearchClear}
          placeholder={t('admin.searchParents')}
          label={t('admin.searchParents')}
        />

        <select
          className="input parents-list-filters__status"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          aria-label={t('academic.status')}
        >
          <option value="">{t('admin.allStates')}</option>
          <option value="active">{t('states.active')}</option>
          <option value="suspended">{t('states.suspended')}</option>
        </select>

        <select
          className="input parents-list-filters__account"
          value={accountFilter}
          onChange={(event) => onAccountFilterChange(event.target.value)}
          aria-label={t('admin.account.filterAll')}
        >
          <option value="">{t('admin.account.filterAll')}</option>
          <option value="has_account">{t('admin.account.filterHasAccount')}</option>
          <option value="no_account">{t('admin.account.filterNoAccount')}</option>
          <option value="active_account">{t('states.active')}</option>
          <option value="inactive_account">{t('admin.account.filterInactiveAccount')}</option>
          <option value="suspended_account">{t('states.suspended')}</option>
        </select>

        <button
          type="button"
          className={[
            'btn btn--ghost btn--sm parents-list-filters__more-toggle',
            hasMoreActive ? 'parents-list-filters__more-toggle--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          {moreOpen ? t('admin.parentsList.filters.hideMore') : t('admin.parentsList.filters.more')}
        </button>

        {hasActiveFilters ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset}>
            {t('admin.parentsList.resetFilters')}
          </button>
        ) : null}
      </div>

      {moreOpen ? (
        <div className="parents-list-filters__more">
          <label className="parents-list-filters__more-field">
            <span className="parents-list-filters__more-label">{t('admin.parentsList.filterChildren')}</span>
            <select
              className="input"
              value={childrenFilter}
              onChange={(event) =>
                onChildrenFilterChange(event.target.value as ParentFamilyFilters['childrenFilter'])
              }
              aria-label={t('admin.parentsList.filterChildren')}
            >
              <option value="">{t('admin.parentsList.filterChildrenAll')}</option>
              <option value="has">{t('admin.parentsList.filterChildrenLinked')}</option>
              <option value="none">{t('admin.parentsList.filterChildrenNone')}</option>
            </select>
          </label>

          <label className="parents-list-filters__more-field">
            <span className="parents-list-filters__more-label">{t('admin.parentsList.filterRelationship')}</span>
            <select
              className="input"
              value={relationshipFilter}
              onChange={(event) => onRelationshipFilterChange(event.target.value)}
              aria-label={t('admin.parentsList.filterRelationship')}
            >
              <option value="">{t('admin.parentsList.filterRelationshipAll')}</option>
              {RELATIONSHIP_TYPE_CODES.map((type) => (
                <option key={type} value={type}>
                  {relationshipTypeLabel(t, type)}
                </option>
              ))}
            </select>
          </label>

          <label className="parents-list-filters__more-field">
            <span className="parents-list-filters__more-label">{t('admin.preferredLanguage')}</span>
            <select
              className="input"
              value={languageFilter}
              onChange={(event) => onLanguageFilterChange(event.target.value)}
              aria-label={t('admin.preferredLanguage')}
            >
              <option value="">{t('admin.parentsList.filterLanguageAll')}</option>
              <option value="ar">{t('admin.parentsList.languageAr')}</option>
              <option value="fr">{t('admin.parentsList.languageFr')}</option>
              <option value="en">{t('admin.parentsList.languageEn')}</option>
            </select>
          </label>

          <label className="parents-list-filters__toggle">
            <input
              type="checkbox"
              checked={hideWithoutChildren}
              onChange={(event) => onHideWithoutChildrenChange(event.target.checked)}
            />
            <span>{t('admin.parentsList.hideWithoutChildren')}</span>
          </label>
        </div>
      ) : null}

      {hasStructuredActive ? (
        <div className="parents-list-filters__chips" aria-live="polite">
          {statusFilter ? (
            <button
              type="button"
              className="parents-list-filters__chip parents-list-filters__chip--action"
              onClick={() => onStatusFilterChange('')}
            >
              {t('admin.parentsList.filters.chipStatus', { status: statusLabel(t, statusFilter) })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {accountFilter ? (
            <button
              type="button"
              className="parents-list-filters__chip parents-list-filters__chip--action"
              onClick={() => onAccountFilterChange('')}
            >
              {accountFilterLabel(t, accountFilter)}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {childrenFilter ? (
            <button
              type="button"
              className="parents-list-filters__chip parents-list-filters__chip--action"
              onClick={() => onChildrenFilterChange('')}
            >
              {childrenFilterLabel(t, childrenFilter)}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {relationshipFilter ? (
            <button
              type="button"
              className="parents-list-filters__chip parents-list-filters__chip--action"
              onClick={() => onRelationshipFilterChange('')}
            >
              {t('admin.parentsList.filters.chipRelationship', {
                relationship: relationshipTypeLabel(t, relationshipFilter),
              })}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {languageFilter ? (
            <button
              type="button"
              className="parents-list-filters__chip parents-list-filters__chip--action"
              onClick={() => onLanguageFilterChange('')}
            >
              {languageFilterLabel(t, languageFilter)}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {hideWithoutChildren === false ? (
            <button
              type="button"
              className="parents-list-filters__chip parents-list-filters__chip--action"
              onClick={() => onHideWithoutChildrenChange(true)}
            >
              {t('admin.parentsList.filters.chipShowGuardianOnly')}
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function accountFilterLabel(t: ReturnType<typeof useT>, accountFilter: string): string {
  switch (accountFilter) {
    case 'has_account':
      return t('admin.account.filterHasAccount');
    case 'no_account':
      return t('admin.account.filterNoAccount');
    case 'active_account':
      return t('states.active');
    case 'inactive_account':
      return t('admin.account.filterInactiveAccount');
    case 'suspended_account':
      return t('states.suspended');
    default:
      return t('admin.account.filterAll');
  }
}

function childrenFilterLabel(
  t: ReturnType<typeof useT>,
  childrenFilter: NonNullable<ParentFamilyFilters['childrenFilter']>,
): string {
  if (childrenFilter === 'has') return t('admin.parentsList.filterChildrenLinked');
  if (childrenFilter === 'none') return t('admin.parentsList.filterChildrenNone');
  return t('admin.parentsList.filterChildrenAll');
}

function languageFilterLabel(t: ReturnType<typeof useT>, languageFilter: string): string {
  if (languageFilter === 'ar') return t('admin.parentsList.languageAr');
  if (languageFilter === 'fr') return t('admin.parentsList.languageFr');
  if (languageFilter === 'en') return t('admin.parentsList.languageEn');
  return t('admin.parentsList.filterLanguageAll');
}
