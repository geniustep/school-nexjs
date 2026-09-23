'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import type { StaffPersonCandidate } from '@/types/staff-templates';

interface StaffExistingPersonPickerProps {
  activeSchoolId: number | null;
  selectedPersonId?: number | null;
  onSelect: (person: StaffPersonCandidate) => void;
  onUseNewPerson: () => void;
}

export function StaffExistingPersonPicker({
  activeSchoolId,
  selectedPersonId,
  onSelect,
  onUseNewPerson,
}: StaffExistingPersonPickerProps) {
  const t = useT();
  const [mode, setMode] = useState<'new' | 'existing'>(selectedPersonId ? 'existing' : 'new');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<StaffPersonCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== 'existing' || query.trim().length < 2 || activeSchoolId == null) {
      setRows([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const result = await api.get<StaffPersonCandidate[]>(
        endpoints.admin.staffPersonCandidates,
        { search: query.trim(), limit: 20, active_school_id: activeSchoolId },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) {
        setRows(result.success ? result.data ?? [] : []);
        setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeSchoolId, mode, query]);

  function switchMode(next: 'new' | 'existing') {
    setMode(next);
    setRows([]);
    setQuery('');
    if (next === 'new') onUseNewPerson();
  }

  return (
    <div className="staff-existing-person">
      <div className="staff-existing-person__mode">
        <button
          type="button"
          className={`btn btn--sm ${mode === 'new' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => switchMode('new')}
        >
          {t('admin.staffCenter.smartCreate.personMode.new')}
        </button>
        <button
          type="button"
          className={`btn btn--sm ${mode === 'existing' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => switchMode('existing')}
        >
          {t('admin.staffCenter.smartCreate.personMode.existing')}
        </button>
      </div>

      {mode === 'existing' ? (
        <div className="staff-existing-person__search">
          <label className="staff-smart-create__field staff-smart-create__field--wide">
            <span className="staff-smart-create__field-label">
              {t('admin.staffCenter.smartCreate.personMode.searchLabel')}
            </span>
            <input
              className="input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('admin.staffCenter.smartCreate.personMode.searchPlaceholder')}
              autoComplete="off"
            />
          </label>

          {loading ? (
            <p className="muted">{t('common.loading')}</p>
          ) : query.trim().length >= 2 && rows.length === 0 ? (
            <p className="muted">{t('admin.staffCenter.smartCreate.personMode.noResults')}</p>
          ) : null}

          {rows.length ? (
            <div className="staff-existing-person__results">
              {rows.map((person) => {
                const selected = selectedPersonId === person.person_id;
                return (
                  <button
                    key={person.person_id}
                    type="button"
                    className={`staff-existing-person__result${selected ? ' is-selected' : ''}`}
                    onClick={() => onSelect(person)}
                    disabled={person.already_staff || (person.has_account && !person.account_active)}
                  >
                    <span className="staff-existing-person__result-main">
                      <strong>{person.name}</strong>
                      <span className="muted">
                        {[person.phone, person.email].filter(Boolean).join(' · ') || t('common.dash')}
                      </span>
                    </span>
                    <span className="staff-existing-person__result-meta">
                      {person.already_staff
                        ? t('admin.staffCenter.smartCreate.personMode.alreadyStaff')
                        : person.has_account && !person.account_active
                          ? t('admin.staffCenter.smartCreate.personMode.inactiveAccount')
                          : person.roles?.length
                            ? person.roles
                                .map((role) =>
                                  t(`admin.staffCenter.smartCreate.personMode.roles.${role}`),
                                )
                                .join(' · ')
                            : t('admin.staffCenter.smartCreate.personMode.existingPerson')}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
