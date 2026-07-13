'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { IconSearch } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import '@/features/admin/teaching-planning/teaching-planning-list.css';

export function TeachingPlanningListSearch({
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
    <label className="tp-list-search">
      <span className="tp-list-search__icon" aria-hidden="true">
        <IconSearch size={18} />
      </span>
      <span className="tp-list-search__sr-only">{label}</span>
      <input
        type="search"
        className="input tp-list-search__input"
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
          className="tp-list-search__clear"
          onClick={onClear}
          aria-label={t('admin.teachingPlanning.filters.clearSearch')}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </label>
  );
}
