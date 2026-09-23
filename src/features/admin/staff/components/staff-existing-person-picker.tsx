'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { searchStaffPersonCandidates } from '@/features/admin/staff/api/staff-templates-api';
import type { StaffPersonCandidate } from '@/types/staff-templates';

type SearchState = 'idle' | 'too-short' | 'loading' | 'results' | 'empty' | 'error';

export function StaffExistingPersonPicker({
  activeSchoolId,
  selected,
  disabled = false,
  onSelect,
}: {
  activeSchoolId?: number | null;
  selected: StaffPersonCandidate | null;
  disabled?: boolean;
  onSelect: (candidate: StaffPersonCandidate) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 350);
  const [state, setState] = useState<SearchState>('idle');
  const [items, setItems] = useState<StaffPersonCandidate[]>([]);
  const requestSeq = useRef(0);

  useEffect(() => {
    const q = debouncedQuery;
    const seq = ++requestSeq.current;
    if (!q) {
      setState('idle');
      setItems([]);
      return;
    }
    if (q.length < 2) {
      setState('too-short');
      setItems([]);
      return;
    }

    setState('loading');
    searchStaffPersonCandidates(q, activeSchoolId)
      .then((result) => {
        if (seq !== requestSeq.current) return;
        if (!result.ok) {
          setState('error');
          setItems([]);
          return;
        }
        setItems(result.candidates);
        setState(result.candidates.length ? 'results' : 'empty');
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setState('error');
        setItems([]);
      });
  }, [debouncedQuery, activeSchoolId]);

  return (
    <div className="staff-existing-person">
      <label className="staff-smart-create__field staff-smart-create__field--wide">
        <span className="staff-smart-create__field-label">
          {t('admin.staffCenter.smartCreate.existingPersonSearchLabel')}
        </span>
        <input
          className="input"
          type="search"
          value={query}
          disabled={disabled}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.staffCenter.smartCreate.existingPersonSearchPlaceholder')}
        />
        <span className="tiny muted">
          {t('admin.staffCenter.smartCreate.existingPersonSearchHint')}
        </span>
      </label>

      <div className="staff-existing-person__results" aria-live="polite">
        {state === 'idle' ? (
          <p className="tiny muted">{t('admin.staffCenter.smartCreate.existingPersonSearchIdle')}</p>
        ) : null}
        {state === 'too-short' ? (
          <p className="tiny muted">{t('admin.staffCenter.smartCreate.existingPersonSearchMin')}</p>
        ) : null}
        {state === 'loading' ? (
          <p className="tiny muted">{t('common.loading')}</p>
        ) : null}
        {state === 'empty' ? (
          <p className="tiny muted">{t('admin.staffCenter.smartCreate.existingPersonNoResults')}</p>
        ) : null}
        {state === 'error' ? (
          <p className="tiny account-password-fields__error" role="alert">
            {t('admin.staffCenter.smartCreate.existingPersonSearchError')}
          </p>
        ) : null}

        {state === 'results' ? (
          <ul className="staff-existing-person__list">
            {items.map((candidate) => {
              const active = selected?.partner_id === candidate.partner_id;
              const roles = candidate.role_labels.length
                ? candidate.role_labels
                : candidate.existing_roles;
              return (
                <li
                  key={candidate.partner_id}
                  className={`staff-existing-person__item${active ? ' is-selected' : ''}`}
                >
                  <div className="staff-existing-person__identity">
                    <strong dir="auto">{candidate.name}</strong>
                    <div className="staff-existing-person__meta">
                      {candidate.phone ? <span dir="ltr">{candidate.phone}</span> : null}
                      {candidate.email ? <span dir="ltr">{candidate.email}</span> : null}
                    </div>
                    {roles.length ? (
                      <p className="tiny muted">
                        {t('admin.staffCenter.smartCreate.existingPersonRoles')}: {roles.join(' · ')}
                      </p>
                    ) : null}
                    <p className="tiny muted">
                      {candidate.has_user_account
                        ? t('admin.staffCenter.smartCreate.existingPersonHasAccount')
                        : t('admin.staffCenter.smartCreate.existingPersonNeedsAccount')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn btn--sm ${active ? 'btn--ghost' : 'btn--primary'}`}
                    disabled={disabled || !candidate.can_link_as_staff}
                    onClick={() => onSelect(candidate)}
                  >
                    {candidate.already_staff_in_school
                      ? t('admin.staffCenter.smartCreate.existingPersonAlreadyStaff')
                      : active
                        ? t('admin.staffCenter.smartCreate.existingPersonSelected')
                        : t('admin.staffCenter.smartCreate.existingPersonUse')}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {selected ? (
        <div className="staff-existing-person__selected" role="status">
          <span className="tiny muted">
            {t('admin.staffCenter.smartCreate.existingPersonSelectedTitle')}
          </span>
          <strong dir="auto">{selected.name}</strong>
          <p className="tiny">
            {selected.has_user_account
              ? t('admin.staffCenter.smartCreate.existingAccountReuseNotice')
              : t('admin.staffCenter.smartCreate.existingIdentityReuseNotice')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
