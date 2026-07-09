'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Shared student selection surface — same search engine as Spotlight / Students list.
 * Selection UX only; does not navigate.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { IconSearch } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import { useStudentSearchPicker } from '../hooks/use-student-search-picker';
import { buildStudentSpotlightDidYouMeanLabel } from '../utils/student-spotlight-utils';
import {
  handleStudentSearchPickerKeyDown,
  STUDENT_SEARCH_MIN_QUERY_LENGTH,
} from '../utils/student-search-picker-utils';
import { StudentSearchPickerRow } from './student-search-picker-row';
import type { StudentSearchHit } from '@/types/student-search';
import './student-search-picker.css';

export type StudentSearchPickerProps = {
  value?: StudentSearchHit | null;
  onSelect: (student: StudentSearchHit) => void;
  onClear?: () => void;
  disabled?: boolean;
  placeholder?: string;
  excludeStudentIds?: number[];
  /** When true, keeps the result list open after selection (default: false). */
  keepOpenOnSelect?: boolean;
};

export function StudentSearchPicker({
  value = null,
  onSelect,
  onClear,
  disabled = false,
  placeholder,
  excludeStudentIds,
  keepOpenOnSelect = false,
}: StudentSearchPickerProps) {
  const t = useT();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const {
    query,
    setQuery,
    clearQuery,
    applySuggestion,
    visibleResults,
    suggestion,
    viewState,
  } = useStudentSearchPicker({ excludeStudentIds, disabled });

  const showList =
    listOpen &&
    !disabled &&
    (viewState === 'loading' ||
      viewState === 'results' ||
      viewState === 'empty' ||
      viewState === 'empty-with-suggestion' ||
      viewState === 'error');

  const didYouMeanParts = buildStudentSpotlightDidYouMeanLabel(t);

  useEffect(() => {
    setActiveIndex(visibleResults.length > 0 ? 0 : -1);
  }, [visibleResults]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLElement>(
      `[data-picker-index="${activeIndex}"]`,
    );
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function selectStudent(student: StudentSearchHit) {
    onSelect(student);
    if (!keepOpenOnSelect) {
      clearQuery();
      setListOpen(false);
    }
    setActiveIndex(-1);
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const outcome = handleStudentSearchPickerKeyDown(event.key, {
      resultCount: visibleResults.length,
      activeIndex,
      listOpen: showList,
    });

    if (outcome.type === 'move') {
      event.preventDefault();
      setActiveIndex(outcome.nextIndex);
      return;
    }

    if (outcome.type === 'select') {
      event.preventDefault();
      const student = visibleResults[outcome.index];
      if (student) selectStudent(student);
      return;
    }

    if (outcome.type === 'close-list') {
      event.preventDefault();
      setListOpen(false);
      setActiveIndex(-1);
    }
  }

  const resolvedPlaceholder =
    placeholder ?? t('admin.studentSearchPicker.placeholder');

  return (
    <div
      className={[
        'student-search-picker',
        disabled ? 'student-search-picker--disabled' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {value ? (
        <div className="student-search-picker__selected">
          <div className="student-search-picker__selected-main">
            <span className="student-search-picker__selected-label">
              {t('admin.studentSearchPicker.selectedLabel')}
            </span>
            <strong dir="auto">{getStudentDisplayName(value)}</strong>
          </div>
          {onClear ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onClear}
              disabled={disabled}
            >
              {t('admin.studentSearchPicker.clearSelection')}
            </button>
          ) : null}
        </div>
      ) : null}

      <label className="student-search-picker__search">
        <span className="student-search-picker__search-icon" aria-hidden="true">
          <IconSearch size={18} />
        </span>
        <span className="student-search-picker__sr-only">{resolvedPlaceholder}</span>
        <input
          ref={inputRef}
          type="search"
          className="input student-search-picker__input"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setListOpen(true);
          }}
          onFocus={() => setListOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={resolvedPlaceholder}
          aria-label={resolvedPlaceholder}
          aria-expanded={showList}
          aria-controls={showList ? listboxId : undefined}
          aria-autocomplete="list"
          role="combobox"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && !disabled ? (
          <button
            type="button"
            className="student-search-picker__clear"
            onClick={() => {
              clearQuery();
              inputRef.current?.focus();
            }}
            aria-label={t('admin.studentSearchPicker.clearSearch')}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </label>

      {viewState === 'too-short' && query.trim() ? (
        <p className="student-search-picker__hint">
          {t('admin.studentSearchPicker.minLengthHint', {
            count: STUDENT_SEARCH_MIN_QUERY_LENGTH,
          })}
        </p>
      ) : null}

      {showList ? (
        <div
          ref={listRef}
          id={listboxId}
          className="student-search-picker__list"
          role="listbox"
          aria-live="polite"
        >
          {viewState === 'loading' ? (
            <p className="student-search-picker__state">{t('admin.studentSearchPicker.loading')}</p>
          ) : null}

          {viewState === 'error' ? (
            <p className="student-search-picker__state student-search-picker__state--error">
              {t('admin.studentSearchPicker.error')}
            </p>
          ) : null}

          {viewState === 'empty' ? (
            <p className="student-search-picker__state">{t('admin.studentSearchPicker.empty')}</p>
          ) : null}

          {viewState === 'empty-with-suggestion' && suggestion ? (
            <div className="student-search-picker__suggestion-wrap">
              <p className="student-search-picker__suggestion">
                <span aria-hidden="true">{didYouMeanParts.before}</span>
                <button
                  type="button"
                  className="student-search-picker__suggestion-query"
                  onClick={() => applySuggestion(suggestion)}
                  aria-label={t('admin.spotlight.didYouMean', { query: suggestion })}
                >
                  {suggestion}
                </button>
                <span aria-hidden="true">{didYouMeanParts.after}</span>
              </p>
              <p className="student-search-picker__state student-search-picker__state--secondary">
                {t('admin.studentSearchPicker.empty')}
              </p>
            </div>
          ) : null}

          {viewState === 'results'
            ? visibleResults.map((student, index) => (
                <div key={student.id} data-picker-index={index}>
                  <StudentSearchPickerRow
                    student={student}
                    active={index === activeIndex}
                    id={`${listboxId}-option-${student.id}`}
                    onHover={() => setActiveIndex(index)}
                    onSelect={() => selectStudent(student)}
                  />
                </div>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}
