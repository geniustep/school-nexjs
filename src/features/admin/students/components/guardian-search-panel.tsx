'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { searchGuardianCandidatesForStudent } from '../utils/guardian-candidate-search';
import { resolveGuardianLinkBlockerMessage } from '../utils/guardian-candidate-presentation';
import { normalizePersonSearchList } from '../utils/normalize-person-search';
import {
  formatMoroccanPhoneDisplay,
  isPhoneLikeQuery,
  moroccanPhoneSearchQuery,
} from '../utils/normalize-moroccan-phone';
import {
  formatRoleLabels,
  hasDuplicateDisplayNames,
  personProfileHref,
} from '../utils/person-role-presentation';
import {
  canDeleteGuardianProfile,
  canLinkPersonAsGuardian,
  canRestoreGuardianProfile,
  guardianProfileId,
  isPersonArchived,
} from '../utils/guardian-profile-contract';
import { deleteBlockerMessage } from '../utils/guardian-delete-impact';
import { GuardianSearchResultCard } from './guardian-search-result-card';
import { GuardianRestoreDialog } from './guardian-restore-dialog';
import { GuardianDeleteDialog } from './guardian-delete-dialog';
import type { PersonSearchResult } from '@/types/student-360';

type SearchState = 'idle' | 'too-short' | 'loading' | 'results' | 'empty' | 'error';

const MIN_QUERY_LENGTH = 2;

export function GuardianSearchPanel({
  studentId,
  linkedGuardianIds = new Set<number>(),
  onSelect,
  onCreateNew,
  initialQuery = '',
  showArchivedToggle = true,
  showCreateOnEmpty = true,
  labels,
}: {
  studentId?: number;
  linkedGuardianIds?: Set<number>;
  onSelect: (person: PersonSearchResult) => void;
  onCreateNew?: (prefill: { query: string }) => void;
  initialQuery?: string;
  showArchivedToggle?: boolean;
  showCreateOnEmpty?: boolean;
  labels?: {
    description?: string;
    placeholder?: string;
    emptyMessage?: string;
    emptyHint?: string;
    searchError?: string;
    duplicateWarning?: string;
    linkButton?: string;
  };
}) {
  const t = useT();
  const user = useSession();
  const { activeSchoolId } = useAdminSession();
  const [query, setQuery] = useState(initialQuery);
  const [includeArchived, setIncludeArchived] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 400);
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchError, setSearchError] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<PersonSearchResult | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonSearchResult | null>(null);
  const requestSeq = useRef(0);

  const showDuplicateNameWarning = searchState === 'results' && hasDuplicateDisplayNames(results);

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
    setSearchError(false);
    setSearchState('loading');

    const q = isPhoneLikeQuery(debouncedQuery) ? moroccanPhoneSearchQuery(debouncedQuery) : debouncedQuery;

    const runSearch = studentId != null
      ? searchGuardianCandidatesForStudent(studentId, {
          query: q,
          activeSchoolId,
          includeArchived,
        })
      : api
          .get<PersonSearchResult[]>(endpoints.admin.guardiansSearch, {
            q,
            page: 1,
            page_size: 20,
            active_school_id: activeSchoolId ?? undefined,
            include_archived: includeArchived ? 'true' : undefined,
          })
          .then((res) => {
            if (!res.success) return { ok: false as const };
            return {
              ok: true as const,
              results: normalizePersonSearchList(res.data),
              source: 'legacy' as const,
            };
          });

    Promise.resolve(runSearch)
      .then((outcome) => {
        if (seq !== requestSeq.current) return;
        if (!outcome.ok) {
          setResults([]);
          setSearchError(true);
          setSearchState('error');
          return;
        }
        setResults(outcome.results);
        setSearchState(outcome.results.length > 0 ? 'results' : 'empty');
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setResults([]);
        setSearchError(true);
        setSearchState('error');
      });
  }, [debouncedQuery, studentId, activeSchoolId, includeArchived]);

  const description = labels?.description ?? t('admin.student360.searchExistingPersonDesc');
  const placeholder = labels?.placeholder ?? t('admin.student360.searchGuardianPlaceholder');
  const emptyMessage =
    labels?.emptyMessage ??
    (includeArchived
      ? t('admin.guardianProfile.searchNoResultsAny')
      : t('admin.guardianProfile.searchNoActiveResults'));
  const emptyHint = labels?.emptyHint ?? t('admin.guardianProfile.searchNoActiveResultsHint');
  const searchErrorMessage = labels?.searchError ?? t('admin.student360.searchPersonError');
  const duplicateWarning = labels?.duplicateWarning ?? t('admin.guardianProfile.duplicateNameWarning');
  const linkButtonLabel = labels?.linkButton;

  function retrySearch() {
    requestSeq.current += 1;
    const current = query;
    setQuery('');
    window.setTimeout(() => setQuery(current), 0);
  }

  function refreshSearch() {
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
    <div className="guardian-search-panel guardian-search-panel--v2">
      <p className="tiny muted">{description}</p>

      <div className="guardian-search-panel__controls">
        <input
          className="input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus
          aria-describedby="guardian-search-hint"
        />
        {showArchivedToggle ? (
          <label className="guardian-search-panel__toggle">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => {
                setIncludeArchived(e.target.checked);
                setResults([]);
              }}
            />
            <span>{t('admin.guardianProfile.showArchivedRecords')}</span>
          </label>
        ) : null}
      </div>

      <p id="guardian-search-hint" className="tiny muted">
        {t('admin.student360.searchGuardianMinHint', { count: MIN_QUERY_LENGTH })}
      </p>

      <div className="guardian-search-panel__results guardian-search-panel__results--scroll" aria-live="polite">
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
          </div>
        ) : null}

        {searchState === 'error' ? (
          <div className="guardian-search-panel__state guardian-search-panel__state--error">
            <p>{searchErrorMessage}</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={retrySearch}>
              {t('common.retry')}
            </button>
          </div>
        ) : null}

        {searchState === 'empty' && !searchError ? (
          <div className="guardian-search-panel__state">
            <p>{emptyMessage}</p>
            {!includeArchived && emptyHint ? (
              <p className="tiny muted">{emptyHint}</p>
            ) : null}
            {showCreateOnEmpty && onCreateNew ? (
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => onCreateNew({ query: debouncedQuery })}>
                {t('admin.student360.createNewPerson')}
              </button>
            ) : null}
          </div>
        ) : null}

        {searchState === 'results' ? (
          <>
            {showDuplicateNameWarning ? (
              <div className="guardian-search-panel__duplicate-warning" role="status">
                {duplicateWarning}
              </div>
            ) : null}
            <ul className="guardian-search-panel__list">
              {results.map((person) => {
                const archived = isPersonArchived(person);
                const alreadyLinked = isAlreadyLinked(person);
                const canLink = canLinkPersonAsGuardian(person, alreadyLinked);
                const linkBlockerMessage =
                  !canLink && !alreadyLinked && !archived
                    ? resolveGuardianLinkBlockerMessage(t, person)
                    : null;
                const canRestore = canRestoreGuardianProfile(person.allowed_actions);
                const canDelete = canDeleteGuardianProfile(person.allowed_actions, user);
                const profileId = guardianProfileId(person);
                const blockerHint =
                  archived && !canRestore && person.delete_impact?.blockers?.[0]
                    ? deleteBlockerMessage(t, person.delete_impact.blockers[0])
                    : archived && !canDelete && !canRestore
                      ? t('admin.guardianProfile.archivedCannotLinkHint')
                      : null;

                return (
                  <li key={`${person.partner_id}-${person.guardian_id ?? 'none'}-${person.status ?? 'active'}`}>
                    <GuardianSearchResultCard
                      person={person}
                      alreadyLinked={alreadyLinked}
                      canLink={canLink}
                      canRestore={canRestore}
                      canDelete={canDelete}
                      blockerHint={blockerHint ?? linkBlockerMessage}
                      linkButtonLabel={linkButtonLabel}
                      onLink={() => onSelect(person)}
                      onRestore={() => setRestoreTarget(person)}
                      onDelete={() => setDeleteTarget(person)}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>

      <GuardianRestoreDialog
        open={!!restoreTarget}
        target={restoreTarget}
        onClose={() => setRestoreTarget(null)}
        onRestored={refreshSearch}
      />

      {deleteTarget && guardianProfileId(deleteTarget) != null ? (
        <GuardianDeleteDialog
          open
          parentId={guardianProfileId(deleteTarget)!}
          parentName={deleteTarget.name}
          allowedActions={deleteTarget.allowed_actions}
          initialImpact={deleteTarget.delete_impact ?? null}
          onClose={() => setDeleteTarget(null)}
          onDeleted={refreshSearch}
        />
      ) : null}
    </div>
  );
}
