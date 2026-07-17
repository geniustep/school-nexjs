'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch } from '@/components/icons/admin-icons';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { useStudentSearchQuery } from '../hooks/use-student-search-query';
import { STUDENT_SEARCH_MIN_QUERY_LENGTH } from '../utils/student-search-query';
import {
  buildStudentSpotlightDidYouMeanLabel,
  canOpenStudentSpotlightMessage,
  canOpenStudentSpotlightPayment,
  canOpenStudentSpotlightProfile,
  isStudentSpotlightCloseKey,
  moveSpotlightActiveIndex,
  studentSpotlightMessagePath,
  studentSpotlightNavigatePath,
  studentSpotlightPaymentPath,
} from '../utils/student-spotlight-utils';
import type { StudentSearchHit } from '@/types/student-search';
import { StudentSpotlightResultRow } from './student-spotlight-result-row';
import './student-spotlight.css';

export function StudentSpotlight({
  onClose,
  focusRequest = 0,
}: {
  onClose: () => void;
  focusRequest?: number;
}) {
  const t = useT();
  const router = useRouter();
  const user = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const { loading, error, results, suggestion } = useStudentSearchQuery(query);
  const trimmedQuery = query.trim();
  const didYouMeanParts = buildStudentSpotlightDidYouMeanLabel(t);
  const showProfile = canOpenStudentSpotlightProfile(user);
  const showPayment = canOpenStudentSpotlightPayment(user);
  const showMessage = canOpenStudentSpotlightMessage(user);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [focusRequest]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isStudentSpotlightCloseKey(event.key)) return;
      event.preventDefault();
      onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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

  function navigateAndClose(path: string) {
    onClose();
    router.push(path);
  }

  function selectStudent(student: StudentSearchHit) {
    navigateAndClose(studentSpotlightNavigatePath(student.id));
  }

  function openPayment(student: StudentSearchHit) {
    navigateAndClose(studentSpotlightPaymentPath(student.id));
  }

  function openMessage(student: StudentSearchHit) {
    navigateAndClose(studentSpotlightMessagePath(student.id));
  }

  function applySuggestion(nextQuery: string) {
    setQuery(nextQuery);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (isStudentSpotlightCloseKey(event.key)) {
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
      const target = event.target as HTMLElement | null;
      if (target?.closest?.('[data-spotlight-action]')) {
        return;
      }
      event.preventDefault();
      selectStudent(results[activeIndex]);
    }
  }

  const showMinLengthHint =
    trimmedQuery.length > 0 && trimmedQuery.length < STUDENT_SEARCH_MIN_QUERY_LENGTH;
  const showResults = !loading && !error && results.length > 0;
  const showZeroResults =
    !loading &&
    !error &&
    trimmedQuery.length >= STUDENT_SEARCH_MIN_QUERY_LENGTH &&
    results.length === 0;
  const showSuggestion = showZeroResults && suggestion != null;
  const showEmpty = showZeroResults && suggestion == null;
  const hasExpandedBody =
    loading || Boolean(error) || showResults || showEmpty || showSuggestion;

  return (
    <div
      className="student-spotlight-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`student-spotlight${hasExpandedBody ? ' student-spotlight--expanded' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('admin.spotlight.title')}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="student-spotlight__search-row">
          <IconSearch size={18} aria-hidden="true" />
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

        {showMinLengthHint ? (
          <p className="student-spotlight__inline-hint">
            {t('admin.spotlight.minLengthHint', { count: STUDENT_SEARCH_MIN_QUERY_LENGTH })}
          </p>
        ) : null}

        <div
          className={`student-spotlight__body${hasExpandedBody ? ' student-spotlight__body--visible' : ''}`}
          aria-live="polite"
        >
          {loading ? (
            <p className="student-spotlight__state">{t('admin.spotlight.loading')}</p>
          ) : null}

          {error ? (
            <p className="student-spotlight__state">{t('admin.spotlight.error')}</p>
          ) : null}

          {showEmpty ? (
            <p className="student-spotlight__state">{t('admin.spotlight.empty')}</p>
          ) : null}

          {showSuggestion ? (
            <div className="student-spotlight__suggestion-wrap">
              <p className="student-spotlight__suggestion">
                <span aria-hidden="true">{didYouMeanParts.before}</span>
                <button
                  type="button"
                  className="student-spotlight__suggestion-query"
                  onClick={() => applySuggestion(suggestion)}
                  aria-label={t('admin.spotlight.didYouMean', { query: suggestion })}
                >
                  {suggestion}
                </button>
                <span aria-hidden="true">{didYouMeanParts.after}</span>
              </p>
              <p className="student-spotlight__state student-spotlight__state--secondary">
                {t('admin.spotlight.empty')}
              </p>
            </div>
          ) : null}

          {showResults ? (
            <ul ref={listRef} className="student-spotlight__list" role="listbox">
              {results.map((student, index) => (
                <li key={student.id} role="presentation">
                  <StudentSpotlightResultRow
                    student={student}
                    active={index === activeIndex}
                    showProfile={showProfile}
                    showPayment={showPayment}
                    showMessage={showMessage}
                    onHover={() => setActiveIndex(index)}
                    onActivate={() => selectStudent(student)}
                    onOpenProfile={() => selectStudent(student)}
                    onOpenPayment={() => openPayment(student)}
                    onOpenMessage={() => openMessage(student)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
