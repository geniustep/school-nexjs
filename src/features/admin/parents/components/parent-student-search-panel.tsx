'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Badge } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { studentClassLabel, studentLevelLabel } from '@/features/admin/students/utils/student-academic-labels';
import type { Student } from '@/types/student';

type SearchState = 'idle' | 'too-short' | 'loading' | 'results' | 'empty' | 'error';

const MIN_QUERY_LENGTH = 2;

export function ParentStudentSearchPanel({
  linkedStudentIds,
  onSelect,
}: {
  linkedStudentIds: Set<number>;
  onSelect: (student: Student) => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const [results, setResults] = useState<Student[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setSearchState('idle');
      return;
    }

    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearchState('too-short');
      return;
    }

    const seq = ++requestSeq.current;
    setSearchState('loading');

    api
      .get<Student[]>(endpoints.admin.students, {
        search: debouncedQuery,
        page: 1,
        page_size: 20,
        active_school_id: activeSchoolId ?? undefined,
      })
      .then((res) => {
        if (seq !== requestSeq.current) return;
        if (!res.success) {
          setResults([]);
          setSearchState('error');
          return;
        }
        const list = Array.isArray(res.data) ? res.data : [];
        setResults(list);
        setSearchState(list.length > 0 ? 'results' : 'empty');
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setSearchState('error');
      });
  }, [debouncedQuery, activeSchoolId]);

  function retrySearch() {
    requestSeq.current += 1;
    const current = query;
    setQuery('');
    window.setTimeout(() => setQuery(current), 0);
  }

  const visibleResults = useMemo(() => results, [results]);

  return (
    <div className="parent-student-search">
      <p className="tiny muted">{t('admin.parentProfile.searchStudentHint')}</p>
      <input
        className="input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('admin.parentProfile.searchStudentPlaceholder')}
        autoFocus
      />
      <p className="tiny muted">
        {t('admin.student360.searchGuardianMinHint', { count: MIN_QUERY_LENGTH })}
      </p>

      <div className="parent-student-search__results" aria-live="polite">
        {searchState === 'idle' ? (
          <div className="parent-student-search__state">
            <p>{t('admin.parentProfile.searchStudentIdle')}</p>
          </div>
        ) : null}

        {searchState === 'too-short' ? (
          <p className="tiny muted">{t('admin.student360.searchGuardianTooShort')}</p>
        ) : null}

        {searchState === 'loading' ? (
          <div className="parent-student-search__skeleton" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="parent-student-search__skeleton-row" />
            ))}
          </div>
        ) : null}

        {searchState === 'error' ? (
          <div className="parent-student-search__state parent-student-search__state--error">
            <p>{t('admin.parentProfile.searchStudentError')}</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={retrySearch}>
              {t('admin.parentProfile.relationshipsRetry')}
            </button>
          </div>
        ) : null}

        {searchState === 'empty' ? (
          <div className="parent-student-search__state">
            <p>{t('admin.parentProfile.searchStudentEmpty')}</p>
          </div>
        ) : null}

        {searchState === 'results' ? (
          <ul className="parent-student-search__list">
            {visibleResults.map((student) => {
              const alreadyLinked = linkedStudentIds.has(student.id);
              const name = getStudentDisplayName(student);
              const classLabel = studentClassLabel(student.class);
              const levelLabel = studentLevelLabel(student.level);
              const schoolNumber = student.school_number ?? student.code ?? student.matricule ?? null;

              return (
                <li key={student.id} className="parent-student-search__row">
                  <div className="parent-student-search__row-main">
                    <div className="parent-student-search__identity">
                      <Avatar name={name} />
                      <div className="parent-student-search__identity-text">
                        <strong dir="auto">{name}</strong>
                        {schoolNumber ? (
                          <span className="tiny mono muted" dir="ltr">
                            {schoolNumber}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="tiny muted">
                      {classLabel} · {levelLabel}
                    </p>
                    <Badge tone={student.status === 'active' ? 'green' : 'slate'}>
                      {statusLabel(t, student.status)}
                    </Badge>
                    {alreadyLinked ? (
                      <span className="parent-student-search__linked-badge">
                        {t('admin.parentProfile.alreadyLinkedStudent')}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    disabled={alreadyLinked}
                    onClick={() => onSelect(student)}
                  >
                    {t('admin.parentProfile.selectStudent')}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
