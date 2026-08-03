'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { EnrollmentIntakeValues } from '@/features/admin/enrollment-intake/types';
import type { AdmissionGuardianPrefillText } from '@/features/admin/admissions/utils/admission-prefill-mapper';
import type { StudentCreateGuardianSourceMode } from '@/types/student-enrollment-finance';
import type { PersonSearchResult } from '@/types/student-360';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import {
  buildGuardianDualSearchQuery,
  GUARDIAN_GLOBAL_SEARCH_MIN_QUERY,
  hasGuardianDualSearchInput,
  searchGuardiansGlobally,
} from '../utils/guardian-global-search';
import { formatMoroccanPhoneDisplay } from '../utils/normalize-moroccan-phone';
import { GuardianAccountOnboardingPanel } from './guardian-account-onboarding-panel';
import { GuardianDuplicateSuggestions } from './guardian-duplicate-suggestions';

export function StudentCreateGuardianSourcePanel({
  intakeValues,
  sourceMode,
  linkedGuardianId,
  linkedGuardianPerson,
  onSourceModeChange,
  onLinkExisting,
  onClearLink,
  allowCreateNewGuardian = true,
  admissionGuardianSnapshot = null,
  admissionSelectionRequired = false,
}: {
  intakeValues: Pick<EnrollmentIntakeValues, 'guardianName' | 'guardianPhone' | 'guardianEmail'>;
  sourceMode: StudentCreateGuardianSourceMode;
  linkedGuardianId: number | null;
  linkedGuardianPerson: PersonSearchResult | null;
  onSourceModeChange: (mode: StudentCreateGuardianSourceMode) => void;
  onLinkExisting: (person: PersonSearchResult) => void;
  onClearLink: () => void;
  /** When false, hide/disable «ولي جديد» — employee may only link an existing guardian. */
  allowCreateNewGuardian?: boolean;
  admissionGuardianSnapshot?: AdmissionGuardianPrefillText | null;
  admissionSelectionRequired?: boolean;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [candidates, setCandidates] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const debouncedName = useDebouncedValue(searchName, 400);
  const debouncedPhone = useDebouncedValue(searchPhone, 400);
  const requestSeq = useRef(0);
  const guardianName =
    (linkedGuardianPerson?.name ?? intakeValues.guardianName).trim() || '—';
  const isExistingMode = sourceMode === 'existing';
  const isLinked = isExistingMode && linkedGuardianId != null;
  const snapshotName = admissionGuardianSnapshot?.name?.trim() ?? '';
  const snapshotPhone = admissionGuardianSnapshot?.phone?.trim() ?? '';
  const showAdmissionSnapshot =
    Boolean(admissionSelectionRequired) &&
    isExistingMode &&
    !isLinked &&
    Boolean(snapshotName || snapshotPhone);
  const searchQuery = buildGuardianDualSearchQuery(debouncedPhone, debouncedName);
  const hasSearchInput = hasGuardianDualSearchInput(debouncedPhone, debouncedName);

  useEffect(() => {
    if (!isExistingMode) {
      setSearchName('');
      setSearchPhone('');
      setCandidates([]);
      setDismissed(false);
    }
  }, [isExistingMode]);

  useEffect(() => {
    setDismissed(false);
  }, [debouncedName, debouncedPhone]);

  useEffect(() => {
    if (!isExistingMode || isLinked) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    if (!hasSearchInput || searchQuery.length < GUARDIAN_GLOBAL_SEARCH_MIN_QUERY) {
      setCandidates([]);
      setLoading(false);
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);

    searchGuardiansGlobally({ query: searchQuery, activeSchoolId, limit: 5 })
      .then((results) => {
        if (seq !== requestSeq.current) return;
        setCandidates(results);
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, [searchQuery, activeSchoolId, hasSearchInput, isExistingMode, isLinked]);

  const showMatches =
    isExistingMode && !isLinked && !loading && candidates.length > 0 && !dismissed && hasSearchInput;

  let boxVariant: 'new' | 'existing' | 'linked' | 'matches' | 'searching' | 'idle' = 'idle';
  if (sourceMode === 'new') {
    boxVariant = 'new';
  } else if (isLinked) {
    boxVariant = 'linked';
  } else if (loading && hasSearchInput) {
    boxVariant = 'searching';
  } else if (showMatches) {
    boxVariant = 'matches';
  } else if (isExistingMode && hasSearchInput) {
    boxVariant = 'existing';
  } else if (isExistingMode) {
    boxVariant = 'idle';
  }

  function selectMode(mode: StudentCreateGuardianSourceMode) {
    if (mode === sourceMode) return;
    if (mode === 'new' && !allowCreateNewGuardian) return;
    setSearchName('');
    setSearchPhone('');
    setCandidates([]);
    setDismissed(false);
    onSourceModeChange(mode);
  }

  function handleClearLink() {
    setSearchName('');
    setSearchPhone('');
    setCandidates([]);
    setDismissed(false);
    onClearLink();
  }

  return (
    <div className="student-create-guardian-source student-create-form__cell student-create-form__cell--full">
      <fieldset className="student-create-guardian-source__picker">
        <legend className="student-create-guardian-source__legend">
          {t('admin.student360.create.billing.guardianSourceChooseTitle')}
        </legend>
        <div
          className="student-create-guardian-source__modes"
          role="radiogroup"
          aria-label={t('admin.student360.create.billing.guardianSourceChooseTitle')}
        >
          <label
            className={`student-create-guardian-source__mode${sourceMode === 'existing' ? ' student-create-guardian-source__mode--active' : ''}`}
          >
            <input
              type="radio"
              name="student-create-guardian-source"
              value="existing"
              checked={sourceMode === 'existing'}
              onChange={() => selectMode('existing')}
            />
            <span className="student-create-guardian-source__mode-label">
              {t('admin.student360.create.billing.guardianSourceExistingLabel')}
            </span>
          </label>
          {allowCreateNewGuardian ? (
            <label
              className={`student-create-guardian-source__mode${sourceMode === 'new' ? ' student-create-guardian-source__mode--active' : ''}`}
            >
              <input
                type="radio"
                name="student-create-guardian-source"
                value="new"
                checked={sourceMode === 'new'}
                onChange={() => selectMode('new')}
              />
              <span className="student-create-guardian-source__mode-label">
                {t('admin.student360.create.billing.guardianSourceNewLabel')}
              </span>
            </label>
          ) : (
            <p className="student-create-field__hint" role="status">
              {t('admin.student360.create.billing.guardianCreateForbiddenHint')}
            </p>
          )}
        </div>
      </fieldset>

      {showAdmissionSnapshot ? (
        <div className="student-create-form__notice" role="status">
          <p>{t('admin.admissions.registration.guardianTextPrefillNotice')}</p>
          <p className="muted" dir="auto">
            {snapshotName || '—'}
            {snapshotPhone ? (
              <>
                {' · '}
                <span dir="ltr">{formatMoroccanPhoneDisplay(snapshotPhone)}</span>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {isExistingMode && !isLinked ? (
        <div className="student-create-guardian-source__search student-create-form__grid">
          <div className="student-create-form__cell student-create-form__cell--half">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.student360.create.billing.guardianSearchByPhone')}
              </span>
              <input
                className="input"
                dir="ltr"
                inputMode="tel"
                autoComplete="off"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder={t('admin.student360.create.billing.guardianSearchPhonePlaceholder')}
              />
              <span className="student-create-field__hint">
                {t('admin.student360.searchGuardianMinHint', { count: 8 })}
              </span>
            </label>
          </div>
          <div className="student-create-form__cell student-create-form__cell--half">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.student360.create.billing.guardianSearchByName')}
              </span>
              <input
                className="input"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                autoComplete="off"
                placeholder={t('admin.student360.create.billing.guardianSearchNamePlaceholder')}
              />
              <span className="student-create-field__hint">
                {t('admin.student360.searchGuardianMinHint', { count: GUARDIAN_GLOBAL_SEARCH_MIN_QUERY })}
              </span>
            </label>
          </div>
        </div>
      ) : null}

      <div
        className={`student-create-guardian-source__box student-create-guardian-source__box--${boxVariant}`}
        role="status"
      >
        <div className="student-create-guardian-source__box-head">
          <span className="student-create-guardian-source__badge">
            {boxVariant === 'linked' ||
            boxVariant === 'existing' ||
            boxVariant === 'matches' ||
            boxVariant === 'searching' ||
            (isExistingMode && boxVariant === 'idle')
              ? t('admin.student360.create.billing.guardianSourceExistingLabel')
              : t('admin.student360.create.billing.guardianSourceNewLabel')}
          </span>
          <p className="student-create-guardian-source__box-title">
            {boxVariant === 'linked'
              ? t('admin.student360.create.billing.guardianSourceLinkedTitle')
              : boxVariant === 'matches'
                ? t('admin.student360.create.billing.guardianSourceMatchesTitle')
                : boxVariant === 'searching'
                  ? t('admin.student360.create.billing.guardianSourceSearchingTitle')
                  : boxVariant === 'existing'
                    ? t('admin.student360.create.billing.guardianSourceExistingPendingTitle')
                    : boxVariant === 'new'
                      ? t('admin.student360.create.billing.guardianSourceNewTitle')
                      : isExistingMode
                        ? t('admin.student360.searchGuardianIdleTitle')
                        : t('admin.student360.create.billing.guardianSourceIdleTitle')}
          </p>
        </div>

        <p className="student-create-guardian-source__box-lead">
          {boxVariant === 'linked'
            ? t('admin.student360.create.billing.guardianSourceLinkedLead', { name: guardianName || '—' })
            : boxVariant === 'matches'
              ? t('admin.student360.create.billing.guardianSourceMatchesLead')
              : boxVariant === 'searching'
                ? t('admin.student360.create.billing.guardianSearching')
                : boxVariant === 'existing'
                  ? t('admin.student360.create.billing.guardianSourceExistingPendingLead')
                  : boxVariant === 'new'
                    ? t('admin.student360.create.billing.guardianSourceNewLead')
                    : isExistingMode
                      ? t('admin.student360.create.billing.guardianSearchExistingHint')
                      : t('admin.student360.create.billing.guardianSourceIdleLead')}
        </p>

        {boxVariant === 'linked' ? (
          <div className="student-create-guardian-source__linked-meta">
            {linkedGuardianId != null ? (
              <span className="student-create-guardian-source__meta-item" dir="ltr">
                {t('admin.student360.create.billing.guardianSelectedId', {
                  id: linkedGuardianId,
                })}
              </span>
            ) : null}
            {intakeValues.guardianPhone.trim() ? (
              <span className="student-create-guardian-source__meta-item" dir="ltr">
                {formatMoroccanPhoneDisplay(intakeValues.guardianPhone)}
              </span>
            ) : null}
            {intakeValues.guardianEmail.trim() ? (
              <span className="student-create-guardian-source__meta-item" dir="ltr">
                {intakeValues.guardianEmail.trim()}
              </span>
            ) : null}
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleClearLink}>
              {t('admin.student360.create.billing.guardianClearLink')}
            </button>
          </div>
        ) : null}

        {boxVariant === 'linked' && linkedGuardianPerson ? (
          <GuardianAccountOnboardingPanel source={linkedGuardianPerson} compact />
        ) : null}
      </div>

      {showMatches ? (
        <GuardianDuplicateSuggestions
          candidates={candidates}
          dismissed={dismissed}
          onUseExisting={onLinkExisting}
          onDismiss={() => {
            setDismissed(true);
            selectMode('new');
          }}
        />
      ) : null}

      {isExistingMode && !isLinked && !loading && hasSearchInput && candidates.length === 0 && !dismissed ? (
        <p className="student-create-form__notice" role="status">
          {t('admin.student360.searchGuardianEmpty')}
        </p>
      ) : null}
    </div>
  );
}
