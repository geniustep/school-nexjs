'use client';

import { useT } from '@/features/i18n/locale-context';
import {
  guardianEntryBillingOptionLabel,
  guardianEntryLabel,
} from '@/features/admin/students/utils/student-create-guardian-payload';
import { relationshipTypeLabel } from '@/features/admin/students/utils/relationship-types';
import { resolveGuardianAccountPresentation } from '@/features/admin/students/utils/resolve-guardian-account-presentation';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';
import type { PersonSearchResult } from '@/types/student-360';
import { GuardianAccountOnboardingPanel } from './guardian-account-onboarding-panel';

function resolveEntryAccountSource(
  entry: StudentCreateGuardianEntry,
  linkedGuardianPerson: PersonSearchResult | null,
  linkedGuardianPersonsByEntryKey: Record<string, PersonSearchResult>,
): PersonSearchResult | null {
  if (entry.kind !== 'existing') return null;
  const personId =
    typeof entry.person_id === 'number' && entry.person_id > 0
      ? entry.person_id
      : null;
  const guardianId =
    typeof entry.guardian_id === 'number' && entry.guardian_id > 0
      ? entry.guardian_id
      : null;
  const matchesEntry = (person: PersonSearchResult | null | undefined) => {
    if (!person) return false;
    if (guardianId != null && person.guardian_id === guardianId) return true;
    const candidatePersonId = person.person_id ?? person.partner_id;
    return personId != null && candidatePersonId === personId;
  };
  const fromMap = linkedGuardianPersonsByEntryKey[entry.entryKey];
  if (matchesEntry(fromMap)) return fromMap;
  if (matchesEntry(linkedGuardianPerson)) return linkedGuardianPerson;
  const canonicalPersonId = personId ?? guardianId;
  if (canonicalPersonId == null) return null;
  return {
    guardian_id: guardianId,
    person_id: personId ?? undefined,
    partner_id: canonicalPersonId,
    id: guardianId ?? canonicalPersonId,
    name: entry.displayName,
    has_user_account: false,
    can_link_as_guardian: true,
    existing_roles: [],
    role_labels: [],
  };
}

export function StudentCreateGuardianProvisionSection({
  guardianEntries,
  provisionAccessByEntryKey,
  linkedGuardianPerson,
  linkedGuardianPersonsByEntryKey = {},
  onProvisionAccessChange,
}: {
  guardianEntries: StudentCreateGuardianEntry[];
  provisionAccessByEntryKey: Record<string, boolean>;
  linkedGuardianPerson: PersonSearchResult | null;
  linkedGuardianPersonsByEntryKey?: Record<string, PersonSearchResult>;
  onProvisionAccessChange: (entryKey: string, enabled: boolean) => void;
}) {
  const t = useT();

  if (guardianEntries.length === 0) return null;

  return (
    <div className="student-create-form__cell student-create-form__cell--full student-create-guardian-provision">
      <h4 className="student-create-form__group-title">
        {t('admin.student360.create.billingResponsibility.provisionAccessTitle')}
      </h4>
      <p className="student-create-field__hint">
        {t('admin.student360.create.billingResponsibility.provisionAccessLead')}
      </p>
      <ul className="student-create-guardian-provision__list">
        {guardianEntries.map((entry) => {
          const accountSource = resolveEntryAccountSource(
            entry,
            linkedGuardianPerson,
            linkedGuardianPersonsByEntryKey,
          );
          const accountPresentation = accountSource
            ? resolveGuardianAccountPresentation(accountSource)
            : null;
          const isExisting = entry.kind === 'existing';
          const relationship = relationshipTypeLabel(t, entry.relationship_type);

          return (
            <li key={entry.entryKey} className="student-create-guardian-provision__item">
              <div className="student-create-guardian-provision__identity">
                <p className="student-create-guardian-provision__name" dir="auto">
                  {guardianEntryLabel(entry)}
                </p>
                <p className="student-create-guardian-provision__relationship">{relationship}</p>
                {isExisting ? (
                  <p className="student-create-field__hint" role="status">
                    {t('admin.student360.create.billingResponsibility.existingGuardianHint')}
                  </p>
                ) : null}
              </div>
              {accountPresentation?.hasVisibleAccountInfo ? (
                <GuardianAccountOnboardingPanel presentation={accountPresentation} compact />
              ) : null}
              <label className="student-create-field student-create-field--checkbox">
                <input
                  type="checkbox"
                  checked={provisionAccessByEntryKey[entry.entryKey] === true}
                  onChange={(e) => onProvisionAccessChange(entry.entryKey, e.target.checked)}
                />
                <span>{t('admin.student360.create.billingResponsibility.provisionAccessLabel')}</span>
              </label>
              <p className="student-create-field__hint">
                {t('admin.student360.create.billingResponsibility.provisionAccessHint')}
              </p>
            </li>
          );
        })}
      </ul>
      {guardianEntries.length > 1 ? (
        <p className="student-create-field__hint">
          {guardianEntries
            .map((entry) => guardianEntryBillingOptionLabel(entry, t))
            .join(' · ')}
        </p>
      ) : null}
    </div>
  );
}
