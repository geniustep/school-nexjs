'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { Badge } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { normalizePersonSearchList } from '../utils/normalize-person-search';
import {
  formatMoroccanPhoneDisplay,
  isPhoneLikeQuery,
  moroccanPhoneSearchQuery,
} from '../utils/normalize-moroccan-phone';
import {
  formatRoleLabels,
  hasDuplicateDisplayNames,
  personProfileDescription,
  personProfileHref,
  shouldShowProfessionalRecordHint,
} from '../utils/person-role-presentation';
import type { PersonSearchResult } from '@/types/student-360';

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
  onSelect: (person: PersonSearchResult) => void;
  onCreateNew: (prefill: { query: string }) => void;
  initialQuery?: string;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchError, setSearchError] = useState(false);
  const requestSeq = useRef(0);

  const showDuplicateNameWarning = useMemo(
    () => searchState === 'results' && hasDuplicateDisplayNames(results),
    [searchState, results],
  );

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
      .get<PersonSearchResult[]>(endpoints.admin.guardiansSearch, {
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
        const list = normalizePersonSearchList(res.data);
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

  function isAlreadyLinked(person: PersonSearchResult): boolean {
    if (person.already_guardian_of_student) return true;
    if (person.guardian_id != null && linkedGuardianIds.has(person.guardian_id)) return true;
    return linkedGuardianIds.has(person.id);
  }

  return (
    <div className="guardian-search-panel">
      <div className="guardian-search-panel__intro">
        <p className="guardian-search-panel__intro-title">{t('admin.student360.searchExistingPerson')}</p>
        <p className="tiny muted">{t('admin.student360.searchExistingPersonDesc')}</p>
      </div>

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
            <p className="guardian-search-panel__state-title">{t('admin.student360.searchPersonIdleTitle')}</p>
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
            <p>{t('admin.student360.searchPersonError')}</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={retrySearch}>
              {t('common.retry')}
            </button>
          </div>
        ) : null}

        {searchState === 'empty' && !loading && !searchError ? (
          <div className="guardian-search-panel__state">
            <p>{t('admin.student360.searchPersonEmpty')}</p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => onCreateNew({ query: debouncedQuery })}>
              {t('admin.student360.createNewPerson')}
            </button>
          </div>
        ) : null}

        {searchState === 'results' ? (
          <>
            {showDuplicateNameWarning ? (
              <div className="guardian-search-panel__duplicate-warning" role="status">
                {t('admin.student360.duplicateNameWarning')}
              </div>
            ) : null}
            <ul className="guardian-search-panel__list">
              {results.map((person) => {
                const alreadyLinked = isAlreadyLinked(person);
                const canLink = person.can_link_as_guardian && !alreadyLinked;
                const roleLine = formatRoleLabels(person.role_labels);
                return (
                  <li key={`partner-${person.partner_id}`} className="guardian-search-panel__row">
                    <div className="guardian-search-panel__row-main">
                      <strong dir="auto">{person.name}</strong>
                      <span className="tiny muted">{personProfileDescription(t, person)}</span>
                      {roleLine ? (
                        <div className="guardian-search-panel__badges">
                          {person.role_labels.map((label) => (
                            <Badge key={`${person.partner_id}-${label}`} tone="slate">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      {person.phone ? (
                        <span className="tiny mono" dir="ltr">
                          {formatMoroccanPhoneDisplay(person.phone)}
                        </span>
                      ) : null}
                      {person.email ? (
                        <span className="tiny" dir="ltr">
                          {person.email}
                        </span>
                      ) : null}
                      <div className="guardian-search-panel__badges">
                        <Badge tone={person.has_user_account ? 'green' : 'slate'}>
                          {person.has_user_account
                            ? t('admin.student360.hasLoginAccount')
                            : t('admin.student360.noLoginAccount')}
                        </Badge>
                        {alreadyLinked ? (
                          <span className="guardian-search-panel__badge">
                            {t('admin.student360.alreadyLinkedGuardian')}
                          </span>
                        ) : null}
                      </div>
                      {shouldShowProfessionalRecordHint(person) ? (
                        <p className="tiny guardian-search-panel__hint">{t('admin.student360.personRecordHasLoginHint')}</p>
                      ) : null}
                    </div>
                    <div className="guardian-search-panel__row-actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => onSelect(person)}
                        disabled={!canLink}
                      >
                        {t('admin.student360.linkPersonAsGuardian')}
                      </button>
                      <Link href={personProfileHref(person)} className="btn btn--ghost btn--sm">
                        {t('admin.student360.guardiansOpenProfile')}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
