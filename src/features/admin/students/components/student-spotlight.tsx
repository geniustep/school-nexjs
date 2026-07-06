'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/primitives';
import { IconSearch } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import { useStudentSearchQuery } from '../hooks/use-student-search-query';
import {
  studentClassLabel,
  studentLevelLabel,
} from '../utils/student-academic-labels';
import { STUDENT_SEARCH_MIN_QUERY_LENGTH } from '../utils/student-search-query';
import {
  isStudentSpotlightCloseKey,
  moveSpotlightActiveIndex,
  studentSpotlightMatchedOnLabelKey,
  studentSpotlightNavigatePath,
} from '../utils/student-spotlight-utils';
import type { StudentSearchHit } from '@/types/student-search';
import './student-spotlight.css';

export function StudentSpotlight({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const { loading, error, results } = useStudentSearchQuery(query);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(-1);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children.item(activeIndex);
    if (item instanceof HTMLElement) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  function selectStudent(student: StudentSearchHit) {
    onClose();
    router.push(studentSpotlightNavigatePath(student.id));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (isStudentSpotlightCloseKey(event.key)) {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => moveSpotlightActiveIndex(current, results.length, 'down'));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => moveSpotlightActiveIndex(current, results.length, 'up'));
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      selectStudent(results[activeIndex]);
    }
  }

  if (!open) return null;

  const showMinLengthHint =
    trimmedQuery.length > 0 && trimmedQuery.length < STUDENT_SEARCH_MIN_QUERY_LENGTH;
  const showIdleHint = trimmedQuery.length === 0;
  const showResults = !loading && !error && results.length > 0;
  const showEmpty =
    !loading &&
    !error &&
    trimmedQuery.length >= STUDENT_SEARCH_MIN_QUERY_LENGTH &&
    results.length === 0;

  return (
    <div
      className="modal-overlay student-spotlight-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-content student-spotlight"
        role="dialog"
        aria-modal="true"
        aria-label={t('admin.spotlight.title')}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="student-spotlight__search-row">
          <IconSearch size={18} />
          <input
            ref={inputRef}
            className="input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.spotlight.placeholder')}
            aria-label={t('admin.spotlight.title')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div className="student-spotlight__body" aria-live="polite">
          {showIdleHint || showMinLengthHint ? (
            <p className="student-spotlight__state">
              {t('admin.spotlight.minLengthHint', { count: STUDENT_SEARCH_MIN_QUERY_LENGTH })}
            </p>
          ) : null}

          {loading ? (
            <p className="student-spotlight__state">{t('admin.spotlight.loading')}</p>
          ) : null}

          {error ? (
            <p className="student-spotlight__state">{t('admin.spotlight.error')}</p>
          ) : null}

          {showEmpty ? (
            <p className="student-spotlight__state">{t('admin.spotlight.empty')}</p>
          ) : null}

          {showResults ? (
            <ul ref={listRef} className="student-spotlight__list" role="listbox">
              {results.map((student, index) => {
                const name = getStudentDisplayName(student);
                const classLabel = studentClassLabel(student.class);
                const levelLabel = studentLevelLabel(student.level);
                const academicLine = [classLabel, levelLabel]
                  .filter((label) => label && label !== '—')
                  .join(' · ');
                const matchedOnKey = studentSpotlightMatchedOnLabelKey(student.matched_on);

                return (
                  <li key={student.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={`student-spotlight__option${
                        index === activeIndex ? ' student-spotlight__option--active' : ''
                      }`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectStudent(student)}
                    >
                      <Avatar name={name} />
                      <span className="student-spotlight__option-main">
                        <span className="student-spotlight__name" dir="auto">
                          {name}
                        </span>
                        {academicLine ? (
                          <span className="student-spotlight__meta">{academicLine}</span>
                        ) : null}
                      </span>
                      {matchedOnKey ? (
                        <span className="student-spotlight__match">{t(matchedOnKey)}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
