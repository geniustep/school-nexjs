'use client';

import { useMemo, useState } from 'react';
import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type {
  StaffTemplateScopeSelection,
  StaffTemplateScopeType,
} from '@/features/admin/staff/utils/staff-template-scope-contract';

type ScopeOption = { id: number; name: string; label?: string };

function optionLabel(option: ScopeOption): string {
  return option.label?.trim() || option.name;
}

function ScopeCheckboxPicker({
  options,
  selectedIds,
  disabled,
  onChange,
  emptyLabel,
  searchPlaceholder,
  selectedAriaLabel,
  removeLabel,
  noMatchLabel,
}: {
  options: ScopeOption[];
  selectedIds: number[];
  disabled: boolean;
  onChange: (ids: number[]) => void;
  emptyLabel: string;
  searchPlaceholder: string;
  selectedAriaLabel: string;
  removeLabel: (name: string) => string;
  noMatchLabel: string;
}) {
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => options.find((item) => item.id === id))
        .filter((item): item is ScopeOption => item != null),
    [options, selectedIds],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter((item) => optionLabel(item).toLowerCase().includes(query));
  }, [options, search]);

  if (!options.length && !selectedIds.length) {
    return <p className="tiny muted">{emptyLabel}</p>;
  }

  return (
    <div className="staff-smart-create__class-picker">
      {options.length > 8 ? (
        <input
          type="search"
          className="input staff-smart-create__class-search"
          value={search}
          placeholder={searchPlaceholder}
          disabled={disabled}
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}

      {selected.length ? (
        <div className="staff-smart-create__selected-classes" aria-label={selectedAriaLabel}>
          {selected.map((item) => (
            <span key={item.id} className="staff-smart-create__selected-class-chip">
              {optionLabel(item)}
              <button
                type="button"
                className="staff-smart-create__selected-class-remove"
                disabled={disabled}
                aria-label={removeLabel(optionLabel(item))}
                onClick={() => onChange(selectedIds.filter((id) => id !== item.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <ul className="staff-smart-create__class-options" role="group">
        {filtered.map((item) => {
          const checked = selectedSet.has(item.id);
          return (
            <li key={item.id}>
              <label className="staff-smart-create__class-option">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() =>
                    onChange(
                      checked
                        ? selectedIds.filter((id) => id !== item.id)
                        : [...selectedIds, item.id].filter(
                            (id, index, list) => list.indexOf(id) === index,
                          ),
                    )
                  }
                />
                <span>{optionLabel(item)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {!filtered.length ? <p className="tiny muted">{noMatchLabel}</p> : null}
    </div>
  );
}

export function StaffTemplateScopeFields({
  scopeType,
  selection,
  levels,
  classes,
  loading,
  error,
  onSelectionChange,
}: {
  scopeType: StaffTemplateScopeType | null;
  selection: StaffTemplateScopeSelection;
  levels: ScopeOption[];
  classes: ScopeOption[];
  loading: boolean;
  error: string | null;
  onSelectionChange: (selection: StaffTemplateScopeSelection) => void;
}) {
  const t = useT();
  if (!scopeType) return null;

  return (
    <section className="staff-smart-create__section-card staff-smart-create__scope">
      <div className="staff-smart-create__section-heading">
        <h3 className="staff-smart-create__section-title">
          {t('admin.staffCenter.smartCreate.scopeSection')}
        </h3>
        <p className="staff-smart-create__section-desc">
          {t('admin.staffCenter.smartCreate.scopeSectionHint')}
        </p>
      </div>

      {scopeType === 'school' ? (
        <InfoBanner
          tone="blue"
          icon="ℹ"
          title={t('admin.staffCenter.smartCreate.scopeSchool')}
        />
      ) : null}

      {scopeType === 'levels' ? (
        <div className="staff-smart-create__field staff-smart-create__field--wide">
          <span className="staff-smart-create__field-label">
            {t('admin.staffCenter.smartCreate.scopeLevels')}
          </span>
          <ScopeCheckboxPicker
            options={levels}
            selectedIds={selection.level_ids}
            disabled={loading}
            onChange={(levelIds) =>
              onSelectionChange({ level_ids: levelIds, class_ids: [] })
            }
            emptyLabel={t('admin.staffCenter.smartCreate.scopeNoLevels')}
            searchPlaceholder={t('admin.staffCenter.smartCreate.scopeSearchLevels')}
            selectedAriaLabel={t('admin.staffCenter.smartCreate.scopeSelectedLevels')}
            removeLabel={(name) => t('admin.staffCenter.smartCreate.scopeRemoveLevel', { name })}
            noMatchLabel={t('admin.staffCenter.smartCreate.scopeNoLevelsMatch')}
          />
        </div>
      ) : null}

      {scopeType === 'classes' ? (
        <div className="staff-smart-create__field staff-smart-create__field--wide">
          <span className="staff-smart-create__field-label">
            {t('admin.staffCenter.smartCreate.scopeClasses')}
          </span>
          <ScopeCheckboxPicker
            options={classes}
            selectedIds={selection.class_ids}
            disabled={loading}
            onChange={(classIds) =>
              onSelectionChange({ level_ids: [], class_ids: classIds })
            }
            emptyLabel={t('admin.staffCenter.smartCreate.scopeNoClasses')}
            searchPlaceholder={t('admin.staffCenter.smartCreate.scopeSearchClasses')}
            selectedAriaLabel={t('admin.staffCenter.smartCreate.scopeSelectedClasses')}
            removeLabel={(name) => t('admin.staffCenter.smartCreate.scopeRemoveClass', { name })}
            noMatchLabel={t('admin.staffCenter.smartCreate.scopeNoClassesMatch')}
          />
        </div>
      ) : null}

      {error ? (
        <p className="tiny account-password-fields__error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
