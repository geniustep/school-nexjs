'use client';

import { useT } from '@/features/i18n/locale-context';
import type { EnrollmentIntakeGuardianOptions } from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import { IdentityDocumentFields } from '@/features/admin/parents/components/identity-document-fields';
import type { IdentityDocumentFieldErrors } from '@/features/admin/parents/utils/identity-document';
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
import {
  resolveGuardianEntryIdentity,
  type StudentCreateGuardianEntryWithIdentity,
} from '../utils/student-create-guardian-identity';
import type { StudentCreateBillingFormState } from '@/types/student-enrollment-finance';

export function StudentCreateAdditionalGuardianCard({
  entry,
  billingState,
  linkedPerson,
  usedGuardianIds,
  fieldError,
  duplicateError,
  identityErrors,
  guardian,
  onSourceModeChange,
  onUpdateEntry,
  onLinkExisting,
  onClearLink,
  onRemove,
  title,
  removable = true,
}: {
  entry: StudentCreateGuardianEntry;
  billingState: StudentCreateBillingFormState;
  linkedPerson: PersonSearchResult | null;
  usedGuardianIds: Set<number>;
  fieldError?: string;
  duplicateError?: string;
  identityErrors?: IdentityDocumentFieldErrors;
  guardian: EnrollmentIntakeGuardianOptions;
  onSourceModeChange: (entryKey: string, mode: StudentCreateGuardianSourceMode) => void;
  onUpdateEntry: (entryKey: string, next: StudentCreateGuardianEntry) => void;
  onLinkExisting: (entryKey: string, person: PersonSearchResult) => void;
  onClearLink: (entryKey: string) => void;
  onRemove: (entryKey: string) => void;
  title?: string;
  removable?: boolean;
}) {
  const t = useT();
  const sourceMode = resolveAdditionalGuardianSourceMode(entry, billingState);
  const isExistingLinked =
    entry.kind === 'existing' &&
    ((typeof entry.guardian_id === 'number' && entry.guardian_id > 0) ||
      (typeof entry.person_id === 'number' && entry.person_id > 0));
  const isExistingPending = sourceMode === 'existing' && !isExistingLinked;
  const accountPresentation =
    linkedPerson && entry.kind === 'existing'
      ? resolveGuardianAccountPresentation(linkedPerson)
      : null;
  const identityDocument = resolveGuardianEntryIdentity(entry);

  function patchNewFields(patch: {
    full_name?: string;
    phone?: string;
    email?: string;
    relationship_type?: StudentCreateGuardianEntry['relationship_type'];
  }) {
    if (entry.kind !== 'new') return;
    onUpdateEntry(entry.entryKey, { ...entry, ...patch });
  }

  function patchIdentity(patch: Partial<typeof identityDocument>) {
    if (entry.kind !== 'new') return;
    const next: StudentCreateGuardianEntryWithIdentity = {
      ...entry,
      identityDocument: { ...identityDocument, ...patch },
    };
    onUpdateEntry(entry.entryKey, next);
  }

  return (
    <article className="student-create-additional-guardian-card">
      <header className="student-create-additional-guardian-card__head">
        <h4 className="student-create-additional-guardian-card__title">
          {title ?? t('admin.student360.create.billing.additionalGuardianTitle')}
        </h4>
        {removable ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => onRemove(entry.entryKey)}
            aria-label={t('admin.student360.create.billing.removeAdditionalGuardian')}
          >
            {t('admin.student360.create.billing.removeAdditionalGuardian')}
          </button>
        ) : null}
      </header>

      <div className="student-create-additional-guardian-card__mode" role="group" aria-label={t('admin.student360.create.billing.guardianSourceChooseTitle')}>
        <button
          type="button"
          className={`btn btn--sm${sourceMode === 'existing' ? ' btn--primary' : ' btn--ghost'}`}
          onClick={() => onSourceModeChange(entry.entryKey, 'existing')}
        >
          {t('admin.student360.create.billing.guardianSourceExistingLabel')}
        </button>
        <button
          type="button"
          className={`btn btn--sm${sourceMode === 'new' ? ' btn--primary' : ' btn--ghost'}`}
          onClick={() => onSourceModeChange(entry.entryKey, 'new')}
        >
          {t('admin.student360.create.billing.guardianSourceNewLabel')}
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
        <>
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
          {entry.kind === 'new' ? (
            <div className="student-create-form__subsection">
              <p className="student-create-field__label">
                {t('admin.identityDocument.sectionTitle')}
              </p>
              <IdentityDocumentFields
                values={identityDocument}
                errors={identityErrors}
                onChange={patchIdentity}
              />
            </div>
          ) : null}
        </>
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
