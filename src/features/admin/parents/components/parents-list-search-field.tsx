'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { IconSearch } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';

export function ParentsListSearchField({
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
    <label className="parents-list-search">
      <span className="parents-list-search__icon" aria-hidden="true">
        <IconSearch size={18} />
      </span>
      <span className="parents-list-search__sr-only">{label}</span>
      <input
        type="search"
        className="input parents-list-search__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value ? (
        <button
          type="button"
          className="parents-list-search__clear"
          onClick={onClear}
          aria-label={t('admin.parentsList.clearSearch')}
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </label>
  );
}
