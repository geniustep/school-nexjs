'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { GuardianSearchPanel } from '@/features/admin/students/components/guardian-search-panel';
import { resolveMaskedIdentityDocument } from '@/features/admin/parents/utils/identity-document';
import type { PersonSearchResult } from '@/types/student-360';
import type { AdmissionOptionItem } from '@/types/admission';
import { AdmissionGuardianCard } from './admission-guardian-card';
import {
  canRemoveGuardian,
  emptyGuardianDraft,
  guardianIdAlreadyLinked,
  removeGuardianDraft,
  setPrimaryGuardian,
  updateGuardianDraft,
} from './guardian-draft';
import type { GuardianDraft } from './types';
import {
  translateAdmissionGuardianWarning,
  isAdmissionGuardianWarningCode,
} from './admission-guardian-warnings';
import type { AdmissionWarningDetail } from './types';

export function AdmissionGuardiansSection({
  guardians,
  onChange,
  mode,
  relationships,
  relationshipsLoading,
  relationshipLoadFailed,
  childrenOptions,
  warnings,
}: {
  guardians: GuardianDraft[];
  onChange: (next: GuardianDraft[]) => void;
  mode: 'individual' | 'family';
  relationships: AdmissionOptionItem[];
  relationshipsLoading?: boolean;
  relationshipLoadFailed?: boolean;
  childrenOptions?: { clientKey: string; label: string }[];
  warnings?: AdmissionWarningDetail[] | null;
}) {
  const t = useT();
  const [searchForKey, setSearchForKey] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  function patchGuardian(clientKey: string, patch: Partial<GuardianDraft>) {
    onChange(updateGuardianDraft(guardians, clientKey, patch));
  }

  function handleAdd() {
    onChange([
      ...guardians,
      emptyGuardianDraft({
        isPrimaryContact: false,
        appliesToAllChildren: mode === 'family',
      }),
    ]);
  }

  function handleRemove(clientKey: string) {
    // UI-only relationship removal — never calls person/guardian delete APIs.
    onChange(removeGuardianDraft(guardians, clientKey));
  }

  function handleSelectExisting(person: PersonSearchResult) {
    if (searchForKey == null) return;
    const guardianId = person.guardian_id ?? person.id;
    if (guardianIdAlreadyLinked(guardians, guardianId, searchForKey)) {
      setLinkError(t('admin.admissions.guardians.errors.duplicateGuardianId'));
      return;
    }
    const masked = resolveMaskedIdentityDocument(person);
    patchGuardian(searchForKey, {
      guardianId,
      personId: person.id,
      name: person.name ?? '',
      phone: person.phone ?? '',
      email: person.email ?? '',
      whatsapp: person.secondary_phone ?? person.phone ?? '',
      identityDocument: {
        ...guardians.find((g) => g.clientKey === searchForKey)!.identityDocument,
        documentNumberMasked: masked ?? '',
      },
    });
    setSearchForKey(null);
    setLinkError(null);
  }

  const visibleWarnings = (warnings ?? []).filter((w) =>
    isAdmissionGuardianWarningCode(w.code),
  );

  return (
    <section className="admission-guardians-section">
      <header className="admission-guardians-section__header">
        <h2 className="admission-guardians-section__title">
          {t('admin.admissions.guardians.sectionTitle')}
        </h2>
        <p className="admission-guardians-section__lead">
          {t('admin.admissions.guardians.sectionLead')}
        </p>
      </header>

      {visibleWarnings.length > 0 ? (
        <ul className="admission-guardians-warnings" role="status">
          {visibleWarnings.map((w, i) => (
            <li key={`${w.code}-${i}`} className="admission-guardians-warnings__item">
              {translateAdmissionGuardianWarning(w.code, t, w.message)}
            </li>
          ))}
        </ul>
      ) : null}

      {linkError ? (
        <div className="alert alert--error" role="alert">
          {linkError}
        </div>
      ) : null}

      <div className="admission-guardians-list">
        {guardians.map((guardian, index) => (
          <div key={guardian.clientKey} className="admission-guardians-list__item">
            <AdmissionGuardianCard
              guardian={guardian}
              index={index}
              mode={mode}
              relationships={relationships}
              relationshipsLoading={relationshipsLoading}
              relationshipLoadFailed={relationshipLoadFailed}
              childrenOptions={childrenOptions}
              canRemove={canRemoveGuardian(guardians, guardian.clientKey)}
              onChange={(patch) => patchGuardian(guardian.clientKey, patch)}
              onRemove={() => handleRemove(guardian.clientKey)}
              onSetPrimary={() => onChange(setPrimaryGuardian(guardians, guardian.clientKey))}
              onSearchExisting={() => {
                setLinkError(null);
                setSearchForKey(guardian.clientKey);
              }}
              searchBusyKey={searchForKey}
            />
            {searchForKey === guardian.clientKey ? (
              <div className="admission-guardian-search">
                <GuardianSearchPanel
                  onSelect={handleSelectExisting}
                  labels={{
                    description: t('admin.admissions.guardians.searchDesc'),
                    placeholder: t('admin.admissions.guardians.searchPlaceholder'),
                    linkButton: t('admin.admissions.guardians.useThisGuardian'),
                  }}
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setSearchForKey(null)}
                >
                  {t('admin.admissions.guardians.hideSearch')}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <button type="button" className="btn btn--ghost admission-guardians-add" onClick={handleAdd}>
        + {t('admin.admissions.guardians.addGuardian')}
      </button>
    </section>
  );
}
