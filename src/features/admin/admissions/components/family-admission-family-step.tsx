'use client';

import { useState } from 'react';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { useT } from '@/features/i18n/locale-context';
import { GuardianSearchPanel } from '@/features/admin/students/components/guardian-search-panel';
import type { PersonSearchResult } from '@/types/student-360';
import type { FamilyAdmissionFamilyFormState } from '../utils/family-admission-form-state';
import type { AdmissionAcademicYearOption, AdmissionOptionItem } from '@/types/admission';

export function FamilyAdmissionFamilyStep({
  family,
  onChange,
  academicYears,
  sources,
  relationships,
  relationshipLoadFailed,
  relationshipsLoading,
}: {
  family: FamilyAdmissionFamilyFormState;
  onChange: (patch: Partial<FamilyAdmissionFamilyFormState>) => void;
  academicYears: AdmissionAcademicYearOption[];
  sources: AdmissionOptionItem[];
  relationships: AdmissionOptionItem[];
  relationshipLoadFailed: boolean;
  relationshipsLoading: boolean;
}) {
  const t = useT();
  const [showGuardianSearch, setShowGuardianSearch] = useState(false);
  const [linkedGuardianLabel, setLinkedGuardianLabel] = useState<string | null>(
    family.guardian_id ? family.guardian_name : null,
  );

  function handleGuardianSelect(person: PersonSearchResult) {
    const guardianId = person.guardian_id ?? person.id;
    onChange({
      guardian_id: guardianId,
      guardian_name: person.name ?? '',
      guardian_phone: person.phone ?? family.guardian_phone,
      guardian_email: person.email ?? family.guardian_email,
      guardian_whatsapp: person.secondary_phone ?? person.phone ?? family.guardian_whatsapp,
    });
    setLinkedGuardianLabel(person.name ?? null);
    setShowGuardianSearch(false);
  }

  function clearLinkedGuardian() {
    onChange({ guardian_id: undefined });
    setLinkedGuardianLabel(null);
  }

  return (
    <section className="family-admission-step family-admission-family-step">
      <header className="family-admission-step__header">
        <h2 className="family-admission-step__title">{t('admin.admissions.family.familyStepTitle')}</h2>
        <p className="family-admission-step__lead">{t('admin.admissions.family.familyStepLead')}</p>
      </header>

      <div className="family-admission-card">
        {family.guardian_id ? (
          <div className="family-admission-guardian-linked" role="status">
            <span className="family-admission-guardian-linked__label">
              {t('admin.admissions.family.linkedGuardian', {
                name: linkedGuardianLabel ?? family.guardian_name,
              })}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearLinkedGuardian}>
              {t('admin.admissions.family.clearLinkedGuardian')}
            </button>
          </div>
        ) : (
          <div className="family-admission-guardian-search-toggle">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setShowGuardianSearch((prev) => !prev)}
            >
              {showGuardianSearch
                ? t('admin.admissions.family.hideGuardianSearch')
                : t('admin.admissions.family.searchExistingGuardian')}
            </button>
          </div>
        )}

        {showGuardianSearch && !family.guardian_id ? (
          <div className="family-admission-guardian-search">
            <GuardianSearchPanel
              onSelect={handleGuardianSelect}
              labels={{
                description: t('admin.admissions.family.guardianSearchDesc'),
                placeholder: t('admin.admissions.family.guardianSearchPlaceholder'),
                linkButton: t('admin.admissions.family.useThisGuardian'),
              }}
            />
          </div>
        ) : null}

        <div className="student-create-form__grid">
          <div className="student-create-form__cell">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.fields.guardianName')}
              </span>
              <input
                className="input"
                value={family.guardian_name}
                onChange={(e) => onChange({ guardian_name: e.target.value })}
                readOnly={Boolean(family.guardian_id)}
              />
            </label>
          </div>

          <div className="student-create-form__cell">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.fields.guardianPhone')}
              </span>
              <input
                className="input"
                dir="ltr"
                value={family.guardian_phone}
                onChange={(e) => onChange({ guardian_phone: e.target.value })}
                readOnly={Boolean(family.guardian_id)}
              />
            </label>
          </div>

          <div className="student-create-form__cell">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.fields.guardianWhatsapp')}
              </span>
              <input
                className="input"
                dir="ltr"
                value={family.guardian_whatsapp}
                onChange={(e) => onChange({ guardian_whatsapp: e.target.value })}
              />
            </label>
          </div>

          <div className="student-create-form__cell">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.fields.guardianEmail')}
              </span>
              <input
                className="input"
                type="email"
                dir="ltr"
                value={family.guardian_email}
                onChange={(e) => onChange({ guardian_email: e.target.value })}
                readOnly={Boolean(family.guardian_id)}
              />
            </label>
          </div>

          <div className="student-create-form__cell">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.fields.relationship')}
              </span>
              {relationshipLoadFailed ? (
                <p className="student-create-field__hint">
                  {t('admin.admissions.create.relationshipLoadError')}
                </p>
              ) : (
                <select
                  className="input"
                  value={family.guardian_relationship}
                  onChange={(e) => onChange({ guardian_relationship: e.target.value })}
                  disabled={relationshipsLoading}
                >
                  <option value="">{t('admin.admissions.create.selectRelationship')}</option>
                  {relationships.map((rel) => {
                    const value = String(rel.value ?? rel.id ?? rel.code ?? '');
                    return (
                      <option key={value} value={value}>
                        {rel.label}
                      </option>
                    );
                  })}
                </select>
              )}
            </label>
          </div>

          <div className="student-create-form__cell student-create-form__cell--full">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.family.sharedAddress')}
              </span>
              <input
                className="input"
                value={family.shared_address}
                onChange={(e) => onChange({ shared_address: e.target.value })}
                placeholder={t('admin.admissions.family.sharedAddressHint')}
              />
            </label>
          </div>

          <div className="student-create-form__cell">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.fields.source')}
              </span>
              <select
                className="input"
                value={family.source_id ?? ''}
                onChange={(e) =>
                  onChange({
                    source_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              >
                <option value="">{t('admin.admissions.create.selectSource')}</option>
                {sources.map((source) => {
                  const id = source.id ?? source.value;
                  return (
                    <option key={String(id)} value={String(id)}>
                      {source.label}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>

          <div className="student-create-form__cell">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.fields.academicYear')}
              </span>
              <select
                className="input"
                value={family.academic_year_id ?? ''}
                onChange={(e) =>
                  onChange({
                    academic_year_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              >
                <option value="">{t('admin.admissions.create.selectAcademicYear')}</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="student-create-form__cell">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.fields.firstContactDate')}
              </span>
              <DatePickerInput
                value={family.first_contact_date}
                onChange={(first_contact_date) => onChange({ first_contact_date })}
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
