'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { normalizeGuardianList } from '../utils/normalize-guardian';
import {
  formatMoroccanPhoneDisplay,
  isPhoneLikeQuery,
  moroccanPhoneSearchQuery,
} from '../utils/normalize-moroccan-phone';
import type { GuardianSummary } from '@/types/student-360';

type SearchState = 'idle' | 'too-short' | 'loading' | 'results' | 'empty' | 'error';

const MIN_QUERY_LENGTH = 2;

export function GuardianSearchPanel({
  studentId,
  linkedGuardianIds,
  onSelect,
  onCreateNew,
  initialQuery = '',
}: {
  studentId: number;
  linkedGuardianIds: Set<number>;
  onSelect: (guardian: GuardianSummary) => void;
  onCreateNew: (prefill: { query: string }) => void;
  initialQuery?: string;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GuardianSummary[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchError, setSearchError] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setSearchState('idle');
      setSearchError(false);
      return;
    }

    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearchState('too-short');
      setSearchError(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setSearchError(false);
    setSearchState('loading');

    const q = isPhoneLikeQuery(debouncedQuery)
      ? moroccanPhoneSearchQuery(debouncedQuery)
      : debouncedQuery;

    api
      .get<GuardianSummary[]>(endpoints.admin.guardiansSearch, {
        q,
        page: 1,
        page_size: 20,
        exclude_student_id: studentId,
        active_school_id: activeSchoolId ?? undefined,
      })
      .then((res) => {
        if (seq !== requestSeq.current) return;
        if (!res.success) {
          setResults([]);
          setSearchError(true);
          setSearchState('error');
          setLoading(false);
          return;
        }
        const list = normalizeGuardianList(res.data);
        setResults(list);
        setSearchState(list.length > 0 ? 'results' : 'empty');
        setLoading(false);
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setSearchError(true);
        setSearchState('error');
        setLoading(false);
      });
  }, [debouncedQuery, studentId, activeSchoolId]);

  function retrySearch() {
    requestSeq.current += 1;
    const current = query;
    setQuery('');
    window.setTimeout(() => setQuery(current), 0);
  }

  return (
    <div className="guardian-search-panel">
      <input
        className="input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('admin.student360.searchGuardianPlaceholder')}
        autoFocus
        aria-describedby="guardian-search-hint"
      />
      <p id="guardian-search-hint" className="tiny muted">
        {t('admin.student360.searchGuardianMinHint', { count: MIN_QUERY_LENGTH })}
      </p>

      <div className="guardian-search-panel__results" aria-live="polite">
        {searchState === 'idle' ? (
          <div className="guardian-search-panel__state">
            <p className="guardian-search-panel__state-title">{t('admin.student360.searchGuardianIdleTitle')}</p>
            <p className="tiny muted">{t('admin.student360.searchGuardianIdleDesc')}</p>
          </div>
        ) : null}

        {searchState === 'too-short' ? (
          <p className="tiny muted guardian-search-panel__state">{t('admin.student360.searchGuardianTooShort')}</p>
        ) : null}

        {searchState === 'loading' ? (
          <div className="guardian-search-panel__skeleton" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="guardian-search-panel__skeleton-row" />
            ))}
            <p className="tiny muted">{t('admin.student360.searchGuardianLoading')}</p>
          </div>
        ) : null}

        {searchState === 'error' ? (
          <div className="guardian-search-panel__state guardian-search-panel__state--error">
            <p>{t('admin.student360.searchGuardianError')}</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={retrySearch}>
              {t('common.retry')}
            </button>
          </div>
        ) : null}

        {searchState === 'empty' && !loading && !searchError ? (
          <div className="guardian-search-panel__state">
            <p>{t('admin.student360.searchGuardianEmpty')}</p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => onCreateNew({ query: debouncedQuery })}>
              {t('admin.student360.createNewGuardian')}
            </button>
          </div>
        ) : null}

        {searchState === 'results' ? (
          <ul className="guardian-search-panel__list">
            {results.map((g) => {
              const alreadyLinked = linkedGuardianIds.has(g.id);
              return (
                <li key={g.id} className="guardian-search-panel__row">
                  <div className="guardian-search-panel__row-main">
                    <strong>{g.name}</strong>
                    {g.phone ? (
                      <span className="tiny mono" dir="ltr">
                        {formatMoroccanPhoneDisplay(g.phone)}
                      </span>
                    ) : null}
                    {g.email ? (
                      <span className="tiny" dir="ltr">
                        {g.email}
                      </span>
                    ) : null}
                    {g.national_id ? (
                      <span className="tiny mono" dir="auto">
                        {g.national_id}
                      </span>
                    ) : null}
                    {g.children_count != null ? (
                      <span className="tiny muted">
                        {t('admin.student360.childrenCount', { count: g.children_count })}
                      </span>
                    ) : null}
                    {alreadyLinked ? (
                      <span className="guardian-search-panel__badge">{t('admin.student360.alreadyLinkedGuardian')}</span>
                    ) : null}
                  </div>
                  <div className="guardian-search-panel__row-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => onSelect(g)}
                      disabled={alreadyLinked}
                    >
                      {t('admin.student360.selectAndLink')}
                    </button>
                    <Link href={`/admin/parents/${g.id}`} className="btn btn--ghost btn--sm">
                      {t('admin.student360.guardiansOpenProfile')}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
