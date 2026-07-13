'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { IconSearch } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';

export function AnnualDistributionsListSearchField({
  value,
  onChange,
  onClear,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  label: string;
}) {
  const t = useT();

  return (
    <label className="annual-distributions-list-search">
      <span className="annual-distributions-list-search__icon" aria-hidden="true">
        <IconSearch size={18} />
      </span>
      <span className="annual-distributions-list-search__sr-only">{label}</span>
      <input
        type="search"
        className="input annual-distributions-list-search__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        dir="auto"
      />
      {value ? (
        <button
          type="button"
          className="annual-distributions-list-search__clear"
          onClick={onClear}
          aria-label={t('admin.teachingPlanning.filters.clearSearch')}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </label>
  );
}
