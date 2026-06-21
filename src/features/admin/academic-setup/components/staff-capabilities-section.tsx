'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useT } from '@/features/i18n/locale-context';
import type { StaffCapabilityOption } from '@/types/academic-setup';
import type { RolePermissionMetadata } from '@/types/academic-setup';
import {
  ROLE_CAPABILITY_HIGHLIGHT_COUNT,
  countSelectedGrantable,
  defaultCategoryExpanded,
  filterCapabilitiesBySearch,
  getStaffCapabilityUxMode,
  groupCapabilitiesByCategory,
  isFinanceCapabilityCategory,
  isSensitiveCapability,
  resolveCapabilityCategoryLabel,
  resolveCapabilityLabel,
  roleCapabilityHighlightKey,
  splitCapabilitiesByGrantable,
} from '../utils/capability-present';
import {
  SCHOOL_MANAGER_PERMISSION_GROUP_COUNT,
  isCapabilitiesEditable,
  schoolManagerPermissionGroupKey,
  type StaffCapabilityDisplayMode,
} from '../utils/staff-permissions-meta';

function CapabilityCheckboxRow({
  cap,
  checked,
  disabled,
  onToggle,
}: {
  cap: StaffCapabilityOption;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: number, next: boolean) => void;
}) {
  const { locale } = useLocale();
  const t = useT();
  const label = resolveCapabilityLabel(locale, cap);
  const sensitive = isSensitiveCapability(cap.code);
  const inputId = `staff-cap-${cap.id}`;

  return (
    <label htmlFor={inputId} className="staff-cap-row">
      <input
        id={inputId}
        type="checkbox"
        className="staff-cap-row__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onToggle(cap.id, e.target.checked)}
      />
      <span className="staff-cap-row__label">
        <span>{label}</span>
        {sensitive ? (
          <span
            className="staff-cap-badge staff-cap-badge--sensitive"
            title={t('admin.academicSetup.staffCapabilities.sensitiveHelp')}
          >
            {t('admin.academicSetup.staffCapabilities.sensitiveBadge')}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function CapabilityReadOnlyRow({ cap, checked }: { cap: StaffCapabilityOption; checked: boolean }) {
  const { locale } = useLocale();
  const t = useT();
  const label = resolveCapabilityLabel(locale, cap);

  return (
    <div className="staff-cap-row staff-cap-row--readonly">
      <span className="staff-cap-row__check" aria-hidden="true">
        {checked ? '✓' : '—'}
      </span>
      <span className="staff-cap-row__label">
        <span>{label}</span>
        <span className="staff-cap-badge staff-cap-badge--auto">
          {t('admin.academicSetup.staffCapabilities.autoGrantedBadge')}
        </span>
      </span>
    </div>
  );
}

function CategoryAccordion({
  category,
  capabilities,
  capabilityIds,
  disabled,
  expanded,
  onToggleExpanded,
  onToggleCap,
  onSelectAll,
  editable,
  financeWarning,
}: {
  category: string;
  capabilities: StaffCapabilityOption[];
  capabilityIds: number[];
  disabled: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onToggleCap: (id: number, next: boolean) => void;
  onSelectAll: (ids: number[], select: boolean) => void;
  editable: boolean;
  financeWarning?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const categoryLabel = resolveCapabilityCategoryLabel(category, t, locale);
  const selectedInCategory = capabilities.filter((c) => capabilityIds.includes(c.id)).length;
  const panelId = `staff-cap-cat-${category}`;
  const allSelected = capabilities.length > 0 && selectedInCategory === capabilities.length;

  return (
    <div className="staff-cap-category">
      <button
        type="button"
        className="staff-cap-category__trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggleExpanded}
      >
        <span className="staff-cap-category__title">{categoryLabel}</span>
        <span className="staff-cap-category__count">
          {t('admin.academicSetup.staffCapabilities.categorySelected', {
            selected: selectedInCategory,
            total: capabilities.length,
          })}
        </span>
        <span className="staff-cap-category__chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded ? (
        <div id={panelId} className="staff-cap-category__panel" role="region" aria-label={categoryLabel}>
          {financeWarning ? (
            <p className="staff-cap-finance-warn tiny" role="note">
              {financeWarning}
            </p>
          ) : null}
          {editable && capabilities.length > 1 ? (
            <div className="staff-cap-category__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={disabled || allSelected}
                onClick={() => onSelectAll(capabilities.map((c) => c.id), true)}
              >
                {t('admin.academicSetup.staffCapabilities.selectAllCategory')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={disabled || selectedInCategory === 0}
                onClick={() => onSelectAll(capabilities.map((c) => c.id), false)}
              >
                {t('admin.academicSetup.staffCapabilities.deselectAllCategory')}
              </button>
            </div>
          ) : null}
          <div className="staff-cap-category__list">
            {capabilities.map((cap) =>
              editable ? (
                <CapabilityCheckboxRow
                  key={cap.id}
                  cap={cap}
                  checked={capabilityIds.includes(cap.id)}
                  disabled={disabled}
                  onToggle={onToggleCap}
                />
              ) : (
                <CapabilityReadOnlyRow
                  key={cap.id}
                  cap={cap}
                  checked={capabilityIds.includes(cap.id)}
                />
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FullSchoolPermissionsCard() {
  const t = useT();
  const groups = Array.from({ length: SCHOOL_MANAGER_PERMISSION_GROUP_COUNT }, (_, i) => {
    const key = schoolManagerPermissionGroupKey(i + 1);
    const label = t(key);
    return label !== key ? label : null;
  }).filter((x): x is string => Boolean(x));

  return (
    <article className="staff-cap-full-school" aria-labelledby="staff-cap-full-school-title">
      <div className="staff-cap-full-school__icon" aria-hidden="true">
        🛡
      </div>
      <div className="staff-cap-full-school__body">
        <div className="staff-cap-full-school__head">
          <h3 id="staff-cap-full-school-title" className="staff-cap-full-school__title">
            {t('admin.academicSetup.staffCapabilities.fullSchoolPermissions')}
          </h3>
          <span className="staff-cap-badge staff-cap-badge--auto">
            {t('admin.academicSetup.staffCapabilities.roleInheritedPermissions')}
          </span>
        </div>
        <p className="staff-cap-full-school__desc">
          {t('admin.academicSetup.staffCapabilities.fullSchoolPermissionsDescription')}
        </p>
        <p className="staff-cap-full-school__status tiny muted">
          {t('admin.academicSetup.staffCapabilities.inheritedPermissionsLabel')}
        </p>
        {groups.length ? (
          <ul className="staff-cap-full-school__groups">
            {groups.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <p className="staff-cap-full-school__scope tiny muted">
          {t('admin.academicSetup.staffCapabilities.permissionsRestrictedToAssignedSchools')}
        </p>
        <p className="staff-cap-full-school__scope tiny muted">
          {t('admin.academicSetup.staffCapabilities.platformPermissionsExcluded')}
        </p>
        <p className="staff-cap-full-school__note tiny muted">
          {t('admin.academicSetup.staffCapabilities.manualCapabilitiesNotRequired')}
        </p>
      </div>
    </article>
  );
}

function PlatformPermissionsCard() {
  const t = useT();
  const titleKey = 'admin.academicSetup.roleCapabilities.project_manager.title';
  const descKey = 'admin.academicSetup.roleCapabilities.project_manager.description';
  const title = t(titleKey);
  const description = t(descKey);
  const highlights = Array.from({ length: ROLE_CAPABILITY_HIGHLIGHT_COUNT }, (_, i) => {
    const key = roleCapabilityHighlightKey('project_manager', i + 1);
    const text = t(key);
    return text !== key ? text : null;
  }).filter((x): x is string => Boolean(x));

  return (
    <article className="staff-cap-full-school staff-cap-full-school--platform" aria-labelledby="staff-cap-platform-title">
      <div className="staff-cap-full-school__icon" aria-hidden="true">
        🛡
      </div>
      <div className="staff-cap-full-school__body">
        <div className="staff-cap-full-school__head">
          <h3 id="staff-cap-platform-title" className="staff-cap-full-school__title">
            {title !== titleKey ? title : t('admin.academicSetup.staffCapabilities.fullPlatformPermissions')}
          </h3>
          <span className="staff-cap-badge staff-cap-badge--auto">
            {t('admin.academicSetup.staffCapabilities.roleInheritedPermissions')}
          </span>
        </div>
        {description !== descKey ? (
          <p className="staff-cap-full-school__desc">{description}</p>
        ) : null}
        {highlights.length ? (
          <ul className="staff-cap-full-school__groups">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <p className="staff-cap-full-school__scope tiny muted">
          {t('admin.academicSetup.staffCapabilities.permissionsRestrictedToAssignedSchools')}
        </p>
      </div>
    </article>
  );
}

function RoleSummaryPanel({ adminKind }: { adminKind: string }) {
  const t = useT();
  const titleKey = `admin.academicSetup.roleCapabilities.${adminKind}.title`;
  const descKey = `admin.academicSetup.roleCapabilities.${adminKind}.description`;
  const autoKey = `admin.academicSetup.roleCapabilities.${adminKind}.autoGrantedLabel`;
  const title = t(titleKey);
  const description = t(descKey);
  const autoLabel = t(autoKey);

  const highlights = Array.from({ length: ROLE_CAPABILITY_HIGHLIGHT_COUNT }, (_, i) => {
    const key = roleCapabilityHighlightKey(adminKind, i + 1);
    const text = t(key);
    return text !== key ? text : null;
  }).filter((x): x is string => Boolean(x));

  return (
    <div className="staff-cap-role-summary">
      <h3 className="staff-cap-role-summary__title">{title !== titleKey ? title : adminKind}</h3>
      {description !== descKey ? (
        <p className="staff-cap-role-summary__desc">{description}</p>
      ) : null}
      {autoLabel !== autoKey ? (
        <p className="staff-cap-role-summary__auto tiny muted">{autoLabel}</p>
      ) : null}
      {highlights.length ? (
        <ul className="staff-cap-role-summary__list">
          {highlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SupervisorScopePanel() {
  const t = useT();
  const scopeTitle = t('admin.academicSetup.roleCapabilities.general_supervisor.scopeTitle');
  const scopeDesc = t('admin.academicSetup.roleCapabilities.general_supervisor.scopeDescription');

  return (
    <div className="staff-cap-supervisor-scope">
      <h4 className="staff-cap-supervisor-scope__title">
        {scopeTitle !== 'admin.academicSetup.roleCapabilities.general_supervisor.scopeTitle'
          ? scopeTitle
          : null}
      </h4>
      {scopeDesc !== 'admin.academicSetup.roleCapabilities.general_supervisor.scopeDescription' ? (
        <p className="staff-cap-supervisor-scope__desc tiny muted">{scopeDesc}</p>
      ) : null}
    </div>
  );
}

export function StaffCapabilitiesSection({
  adminKind,
  permissionsMeta,
  displayMode,
  capabilities,
  capabilityIds,
  onCapabilityIdsChange,
  catalogReady,
  catalogLoading,
  catalogError,
  onRetryCatalog,
  disabled,
  onCapabilitiesTouched,
}: {
  adminKind: string;
  permissionsMeta: RolePermissionMetadata;
  displayMode: StaffCapabilityDisplayMode;
  capabilities: StaffCapabilityOption[];
  capabilityIds: number[];
  onCapabilityIdsChange: (ids: number[]) => void;
  catalogReady: boolean;
  catalogLoading: boolean;
  catalogError?: string | null;
  onRetryCatalog?: () => void;
  disabled: boolean;
  onCapabilitiesTouched: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();

  if (displayMode === 'full_school_readonly') {
    return (
      <section className="staff-cap-section" aria-labelledby="staff-cap-section-title">
        <h3 id="staff-cap-section-title" className="staff-cap-section__title">
          {t('admin.academicSetup.staffCapabilities.sectionTitle')}
        </h3>
        <FullSchoolPermissionsCard />
      </section>
    );
  }

  if (displayMode === 'platform_readonly') {
    return (
      <section className="staff-cap-section" aria-labelledby="staff-cap-section-title">
        <h3 id="staff-cap-section-title" className="staff-cap-section__title">
          {t('admin.academicSetup.staffCapabilities.sectionTitle')}
        </h3>
        <PlatformPermissionsCard />
      </section>
    );
  }

  const capabilitiesEditable = isCapabilitiesEditable(permissionsMeta);
  const mode =
    displayMode === 'assigned_editor'
      ? 'full_editor'
      : displayMode === 'supervisor_scoped'
        ? 'supervisor'
        : getStaffCapabilityUxMode(adminKind);
  const [search, setSearch] = useState('');
  const [additionalOpen, setAdditionalOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const { base, additional } = useMemo(
    () => splitCapabilitiesByGrantable(capabilities),
    [capabilities],
  );

  const filteredAdditional = useMemo(
    () => filterCapabilitiesBySearch(additional, search, locale, t),
    [additional, search, locale, t],
  );

  const groupedAdditional = useMemo(
    () => groupCapabilitiesByCategory(filteredAdditional),
    [filteredAdditional],
  );

  const groupedBase = useMemo(
    () => groupCapabilitiesByCategory(base),
    [base],
  );

  const selectedGrantableCount = countSelectedGrantable(capabilityIds, additional);

  const resolveExpanded = useCallback(
    (category: string, selectedInCategory: number, explicitKey?: string) => {
      const key = explicitKey ?? category;
      if (expandedCategories[key] === true) return true;
      if (expandedCategories[key] === false) return false;
      return defaultCategoryExpanded(category, selectedInCategory);
    },
    [expandedCategories],
  );

  const financeWarning = t('admin.academicSetup.staffCapabilities.financeSectionWarning');

  const setExpandedAll = useCallback(
    (open: boolean) => {
      const next: Record<string, boolean> = {};
      for (const g of groupedAdditional) next[g.category] = open;
      setExpandedCategories(next);
    },
    [groupedAdditional],
  );

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  }, []);

  const toggleCap = useCallback(
    (id: number, next: boolean) => {
      onCapabilitiesTouched();
      onCapabilityIdsChange(
        next
          ? capabilityIds.includes(id)
            ? capabilityIds
            : [...capabilityIds, id]
          : capabilityIds.filter((x) => x !== id),
      );
    },
    [capabilityIds, onCapabilityIdsChange, onCapabilitiesTouched],
  );

  const selectAllInCategory = useCallback(
    (ids: number[], select: boolean) => {
      onCapabilitiesTouched();
      if (select) {
        const merged = new Set([...capabilityIds, ...ids]);
        onCapabilityIdsChange([...merged]);
      } else {
        const remove = new Set(ids);
        onCapabilityIdsChange(capabilityIds.filter((id) => !remove.has(id)));
      }
    },
    [capabilityIds, onCapabilityIdsChange, onCapabilitiesTouched],
  );

  if (catalogLoading) {
    return (
      <section className="staff-cap-section" aria-busy="true">
        <div className="staff-cap-section__head">
          <h3 className="staff-cap-section__title">{t('admin.academicSetup.staffCapabilities.sectionTitle')}</h3>
        </div>
        <div className="staff-cap-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="staff-cap-skeleton__block" />
          ))}
        </div>
      </section>
    );
  }

  if (catalogError) {
    return (
      <section className="staff-cap-section staff-cap-section--error">
        <p className="staff-cap-section__error">{t('admin.academicSetup.staffCapabilities.loadError')}</p>
        {onRetryCatalog ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetryCatalog}>
            {t('admin.academicSetup.staffCapabilities.retry')}
          </button>
        ) : null}
      </section>
    );
  }

  if (!catalogReady) {
    return (
      <section className="staff-cap-section staff-cap-section--warn">
        <p className="staff-cap-section__warn">{t('admin.academicSetup.staffCapabilities.catalogUnavailableWarning')}</p>
      </section>
    );
  }

  if (capabilities.length === 0) {
    return (
      <section className="staff-cap-section">
        <p className="muted">{t('admin.academicSetup.staffCapabilities.emptyCatalog')}</p>
      </section>
    );
  }

  const showFullEditor = mode === 'full_editor' && capabilitiesEditable;
  const showRoleSummary = mode === 'role_summary' || mode === 'supervisor';
  const hasAdditional = additional.length > 0 && capabilitiesEditable;
  const hasBase = base.length > 0 && capabilitiesEditable;

  return (
    <section className="staff-cap-section" aria-labelledby="staff-cap-section-title">
      <div className="staff-cap-section__head">
        <div>
          <h3 id="staff-cap-section-title" className="staff-cap-section__title">
            {t('admin.academicSetup.staffCapabilities.sectionTitle')}
          </h3>
          <p className="staff-cap-section__subtitle tiny muted">
            {t('admin.academicSetup.staffCapabilities.sectionSubtitle')}
          </p>
        </div>
        {showFullEditor && hasAdditional ? (
          <p className="staff-cap-section__counter tiny">
            {t('admin.academicSetup.staffCapabilities.selectedCount', {
              count: selectedGrantableCount,
            })}
          </p>
        ) : null}
      </div>

      {showRoleSummary ? (
        <>
          <RoleSummaryPanel adminKind={adminKind} />
          {mode === 'supervisor' ? <SupervisorScopePanel /> : null}
          {!capabilitiesEditable ? (
            <p className="staff-cap-full-school__status tiny muted">
              {t('admin.academicSetup.staffCapabilities.inheritedPermissionsLabel')}
            </p>
          ) : null}
          {hasBase ? (
            <div className="staff-cap-base-readonly">
              <h4 className="staff-cap-subsection__title">
                {t('admin.academicSetup.staffCapabilities.baseSectionTitle')}
              </h4>
              {groupedBase.map((g) => {
                const selectedInCategory = g.capabilities.filter((c) => capabilityIds.includes(c.id)).length;
                return (
                <CategoryAccordion
                  key={g.category}
                  category={g.category}
                  capabilities={g.capabilities}
                  capabilityIds={capabilityIds}
                  disabled
                  expanded={resolveExpanded(g.category, selectedInCategory)}
                  onToggleExpanded={() => toggleCategory(g.category)}
                  onToggleCap={toggleCap}
                  onSelectAll={selectAllInCategory}
                  editable={false}
                  financeWarning={isFinanceCapabilityCategory(g.category) ? financeWarning : undefined}
                />
              );})}
            </div>
          ) : null}
        </>
      ) : null}

      {showFullEditor && hasBase ? (
        <div className="staff-cap-base-readonly">
          <h4 className="staff-cap-subsection__title">
            {t('admin.academicSetup.staffCapabilities.baseSectionTitle')}
          </h4>
          {groupedBase.map((g) => (
            <CategoryAccordion
              key={g.category}
              category={g.category}
              capabilities={g.capabilities}
              capabilityIds={capabilityIds}
              disabled
              expanded={Boolean(expandedCategories[`base-${g.category}`])}
              onToggleExpanded={() =>
                setExpandedCategories((prev) => ({
                  ...prev,
                  [`base-${g.category}`]: !prev[`base-${g.category}`],
                }))
              }
              onToggleCap={toggleCap}
              onSelectAll={selectAllInCategory}
              editable={false}
            />
          ))}
        </div>
      ) : null}

      {hasAdditional ? (
        <div className="staff-cap-additional">
          {showRoleSummary ? (
            <button
              type="button"
              className="staff-cap-additional__toggle"
              aria-expanded={additionalOpen}
              onClick={() => setAdditionalOpen((v) => !v)}
            >
              <span>{t('admin.academicSetup.staffCapabilities.additionalSectionTitle')}</span>
              <span className="tiny muted">
                {t('admin.academicSetup.staffCapabilities.categorySelected', {
                  selected: selectedGrantableCount,
                  total: additional.length,
                })}
              </span>
              <span aria-hidden="true">{additionalOpen ? '▾' : '▸'}</span>
            </button>
          ) : (
            <h4 className="staff-cap-subsection__title">
              {t('admin.academicSetup.staffCapabilities.additionalSectionTitle')}
            </h4>
          )}

          {(showFullEditor || additionalOpen) ? (
            <>
              {showFullEditor ? (
                <div className="staff-cap-toolbar">
                  <label className="staff-cap-search">
                    <span className="academic-setup-sr-only">
                      {t('admin.academicSetup.staffCapabilities.searchPlaceholder')}
                    </span>
                    <input
                      type="search"
                      className="input staff-cap-search__input"
                      value={search}
                      placeholder={t('admin.academicSetup.staffCapabilities.searchPlaceholder')}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={disabled}
                    />
                  </label>
                  <div className="staff-cap-toolbar__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setExpandedAll(true)}
                    >
                      {t('admin.academicSetup.staffCapabilities.expandAll')}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setExpandedAll(false)}
                    >
                      {t('admin.academicSetup.staffCapabilities.collapseAll')}
                    </button>
                  </div>
                </div>
              ) : null}

              {groupedAdditional.length === 0 ? (
                <p className="muted">{t('admin.academicSetup.staffCapabilities.emptySearch')}</p>
              ) : (
                groupedAdditional.map((g) => {
                  const selectedInCategory = g.capabilities.filter((c) => capabilityIds.includes(c.id)).length;
                  return (
                  <CategoryAccordion
                    key={g.category}
                    category={g.category}
                    capabilities={g.capabilities}
                    capabilityIds={capabilityIds}
                    disabled={disabled}
                    expanded={
                      showFullEditor
                        ? resolveExpanded(g.category, selectedInCategory)
                        : Boolean(expandedCategories[g.category])
                    }
                    onToggleExpanded={() => toggleCategory(g.category)}
                    onToggleCap={toggleCap}
                    onSelectAll={selectAllInCategory}
                    editable
                    financeWarning={isFinanceCapabilityCategory(g.category) ? financeWarning : undefined}
                  />
                );})
              )}
            </>
          ) : null}
        </div>
      ) : showRoleSummary && capabilitiesEditable && !hasBase && !hasAdditional ? (
        <p className="muted tiny">{t('admin.academicSetup.staffCapabilities.emptyCatalog')}</p>
      ) : null}
    </section>
  );
}
