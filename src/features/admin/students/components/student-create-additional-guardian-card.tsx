'use client';

import { useT } from '@/features/i18n/locale-context';
import type { EnrollmentIntakeGuardianOptions } from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import type {
  StudentCreateGuardianEntry,
  StudentCreateGuardianSourceMode,
} from '@/types/student-enrollment-finance';
import type { PersonSearchResult } from '@/types/student-360';
import { GuardianSearchPanel } from './guardian-search-panel';
import { GuardianAccountOnboardingPanel } from './guardian-account-onboarding-panel';
import { resolveGuardianAccountPresentation } from '../utils/resolve-guardian-account-presentation';
import { relationshipTypeLabel } from '../utils/relationship-types';
import { RELATIONSHIP_TYPE_CODES } from '../utils/relationship-types';
import { resolveAdditionalGuardianSourceMode } from '../utils/student-create-additional-guardians';
import type { StudentCreateBillingFormState } from '@/types/student-enrollment-finance';

export function StudentCreateAdditionalGuardianCard({
  entry,
  billingState,
  linkedPerson,
  usedGuardianIds,
  fieldError,
  duplicateError,
  guardian,
  onSourceModeChange,
  onUpdateEntry,
  onLinkExisting,
  onClearLink,
  onRemove,
}: {
  entry: StudentCreateGuardianEntry;
  billingState: StudentCreateBillingFormState;
  linkedPerson: PersonSearchResult | null;
  usedGuardianIds: Set<number>;
  fieldError?: string;
  duplicateError?: string;
  guardian: EnrollmentIntakeGuardianOptions;
  onSourceModeChange: (entryKey: string, mode: StudentCreateGuardianSourceMode) => void;
  onUpdateEntry: (entryKey: string, next: StudentCreateGuardianEntry) => void;
  onLinkExisting: (entryKey: string, person: PersonSearchResult) => void;
  onClearLink: (entryKey: string) => void;
  onRemove: (entryKey: string) => void;
}) {
  const t = useT();
  const sourceMode = resolveAdditionalGuardianSourceMode(entry, billingState);
  const isExistingLinked = entry.kind === 'existing' && entry.guardian_id > 0;
  const isExistingPending = sourceMode === 'existing' && !isExistingLinked;
  const accountPresentation =
    linkedPerson && entry.kind === 'existing'
      ? resolveGuardianAccountPresentation(linkedPerson)
      : null;

  function patchNewFields(patch: {
    full_name?: string;
    phone?: string;
    email?: string;
    relationship_type?: StudentCreateGuardianEntry['relationship_type'];
  }) {
    if (entry.kind !== 'new') return;
    onUpdateEntry(entry.entryKey, { ...entry, ...patch });
  }

  return (
    <article className="student-create-additional-guardian-card">
      <header className="student-create-additional-guardian-card__head">
        <h4 className="student-create-additional-guardian-card__title">
          {t('admin.student360.create.billing.additionalGuardianTitle')}
        </h4>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => onRemove(entry.entryKey)}
        >
          {t('admin.student360.create.billing.removeAdditionalGuardian')}
        </button>
      </header>

      <div className="student-create-additional-guardian-card__mode">
        <button
          type="button"
          className={`btn btn--sm${sourceMode === 'new' ? ' btn--primary' : ' btn--ghost'}`}
          onClick={() => onSourceModeChange(entry.entryKey, 'new')}
        >
          {t('admin.student360.create.billing.guardianSourceNewTitle')}
        </button>
        <button
          type="button"
          className={`btn btn--sm${sourceMode === 'existing' ? ' btn--primary' : ' btn--ghost'}`}
          onClick={() => onSourceModeChange(entry.entryKey, 'existing')}
        >
          {t('admin.student360.create.billing.guardianSourceExistingPendingTitle')}
        </button>
      </div>

      <label className="student-create-field">
        <span className="student-create-field__label">{t('admin.admissions.fields.relationship')}</span>
        {guardian.relationshipLoadFailed ? (
          <p className="student-create-field__hint">{t('admin.admissions.create.relationshipLoadError')}</p>
        ) : (
          <select
            className="input"
            value={entry.relationship_type}
            onChange={(e) => {
              const relationship_type = e.target.value as StudentCreateGuardianEntry['relationship_type'];
              if (entry.kind === 'existing') {
                onUpdateEntry(entry.entryKey, { ...entry, relationship_type });
              } else {
                patchNewFields({ relationship_type });
              }
            }}
            disabled={guardian.relationshipsLoading}
          >
            {guardian.relationships.length > 0
              ? guardian.relationships.map((rel) => {
                  const value = String(rel.value ?? rel.id ?? '');
                  return (
                    <option key={value} value={value}>
                      {rel.label}
                    </option>
                  );
                })
              : RELATIONSHIP_TYPE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {relationshipTypeLabel(t, code)}
                  </option>
                ))}
          </select>
        )}
      </label>

      {sourceMode === 'new' ? (
        <div className="student-create-form__grid">
          <div className="student-create-form__cell student-create-form__cell--half">
            <label className="student-create-field">
              <span className="student-create-field__label">{t('admin.admissions.fields.guardianName')}</span>
              <input
                className="input"
                dir="auto"
                value={entry.kind === 'new' ? entry.full_name : ''}
                onChange={(e) => patchNewFields({ full_name: e.target.value })}
              />
            </label>
          </div>
          <div className="student-create-form__cell student-create-form__cell--half">
            <label className="student-create-field">
              <span className="student-create-field__label">{t('admin.admissions.fields.guardianPhone')}</span>
              <input
                className="input"
                dir="ltr"
                value={entry.kind === 'new' ? (entry.phone ?? '') : ''}
                onChange={(e) => patchNewFields({ phone: e.target.value })}
              />
            </label>
          </div>
          <div className="student-create-form__cell student-create-form__cell--full">
            <label className="student-create-field">
              <span className="student-create-field__label">{t('admin.admissions.fields.guardianEmail')}</span>
              <input
                className="input"
                type="email"
                dir="ltr"
                value={entry.kind === 'new' ? (entry.email ?? '') : ''}
                onChange={(e) => patchNewFields({ email: e.target.value })}
              />
            </label>
          </div>
        </div>
      ) : null}

      {isExistingPending ? (
        <GuardianSearchPanel
          linkedGuardianIds={usedGuardianIds}
          onSelect={(person) => onLinkExisting(entry.entryKey, person)}
          showCreateOnEmpty={false}
          labels={{
            description: t('admin.student360.create.billing.guardianSearchExistingHint'),
            duplicateWarning: t('admin.student360.create.billingResponsibility.errors.duplicateGuardianInWizard'),
          }}
        />
      ) : null}

      {isExistingLinked ? (
        <div className="student-create-additional-guardian-card__linked">
          <p className="student-create-guardian-billing__link" role="status">
            {t('admin.student360.create.billing.guardianSourceLinkedLead', {
              name: entry.displayName,
            })}
          </p>
          <p className="student-create-field__hint" role="status">
            {t('admin.student360.create.billingResponsibility.existingGuardianHint')}
          </p>
          {accountPresentation?.hasVisibleAccountInfo ? (
            <GuardianAccountOnboardingPanel presentation={accountPresentation} compact />
          ) : null}
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onClearLink(entry.entryKey)}>
            {t('admin.student360.create.billing.guardianClearLink')}
          </button>
        </div>
      ) : null}

      {fieldError ? (
        <p className="student-create-field__error" role="alert">
          {fieldError}
        </p>
      ) : null}
      {duplicateError ? (
        <p className="student-create-field__error" role="alert">
          {duplicateError}
        </p>
      ) : null}
    </article>
  );
}
