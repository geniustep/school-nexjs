'use client';

import { useT } from '@/features/i18n/locale-context';
import type { EnrollmentIntakeGuardianOptions } from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import type {
  StudentCreateBillingFormState,
  StudentCreateGuardianEntry,
  StudentCreateGuardianSourceMode,
} from '@/types/student-enrollment-finance';
import type { PersonSearchResult } from '@/types/student-360';
import { StudentCreateAdditionalGuardianCard } from './student-create-additional-guardian-card';
import type { BillingResponsibilityFieldErrors } from '../utils/student-create-billing-responsibility';
import type { StudentCreateGuardianIdentityValidationErrors } from '../utils/student-create-guardian-identity';

export function StudentCreateAdditionalGuardiansSection({
  billingState,
  billingErrors,
  guardian,
  usedGuardianIds,
  linkedGuardianPersonsByEntryKey,
  canAddGuardian,
  addGuardianHint,
  onAddGuardian,
  onSourceModeChange,
  onUpdateEntry,
  onLinkExisting,
  onClearLink,
  onRemove,
}: {
  billingState: StudentCreateBillingFormState;
  billingErrors?: BillingResponsibilityFieldErrors & StudentCreateGuardianIdentityValidationErrors;
  guardian: EnrollmentIntakeGuardianOptions;
  usedGuardianIds: Set<number>;
  linkedGuardianPersonsByEntryKey: Record<string, PersonSearchResult>;
  canAddGuardian: boolean;
  addGuardianHint: string;
  onAddGuardian: () => void;
  onSourceModeChange: (entryKey: string, mode: StudentCreateGuardianSourceMode) => void;
  onUpdateEntry: (entryKey: string, next: StudentCreateGuardianEntry) => void;
  onLinkExisting: (entryKey: string, person: PersonSearchResult) => void;
  onClearLink: (entryKey: string) => void;
  onRemove: (entryKey: string) => void;
}) {
  const t = useT();

  return (
    <div className="student-create-additional-guardians">
      {billingState.guardianEntries.length > 0 ? (
        <ul className="student-create-additional-guardians__list">
          {billingState.guardianEntries.map((entry) => (
            <li key={entry.entryKey}>
              <StudentCreateAdditionalGuardianCard
                entry={entry}
                billingState={billingState}
                linkedPerson={linkedGuardianPersonsByEntryKey[entry.entryKey] ?? null}
                usedGuardianIds={usedGuardianIds}
                fieldError={billingErrors?.additionalGuardianErrorsByEntryKey?.[entry.entryKey]}
                duplicateError={billingErrors?.duplicateGuardianId}
                identityErrors={billingErrors?.additionalGuardianIdentityErrorsByEntryKey?.[entry.entryKey]}
                guardian={guardian}
                onSourceModeChange={onSourceModeChange}
                onUpdateEntry={onUpdateEntry}
                onLinkExisting={onLinkExisting}
                onClearLink={onClearLink}
                onRemove={onRemove}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {billingErrors?.duplicateGuardianId && billingState.guardianEntries.length === 0 ? (
        <p className="student-create-field__error" role="alert">
          {billingErrors.duplicateGuardianId}
        </p>
      ) : null}

      {!canAddGuardian ? (
        <p className="student-create-field__hint" role="status">
          {addGuardianHint}
        </p>
      ) : null}

      <button
        type="button"
        className="btn btn--ghost student-create-additional-guardians__add"
        onClick={onAddGuardian}
        disabled={!canAddGuardian}
      >
        {t('admin.student360.create.billing.addAnotherGuardian')}
      </button>
    </div>
  );
}
