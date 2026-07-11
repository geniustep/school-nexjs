'use client';

import { DatePickerInput } from '@/components/ui/date-picker-input';
import { useT } from '@/features/i18n/locale-context';
import { AdmissionGuardiansSection } from '@/features/admin/admissions/guardians';
import type { GuardianDraft } from '@/features/admin/admissions/guardians';
import type { FamilyAdmissionFamilyFormState } from '../utils/family-admission-form-state';
import type { AdmissionAcademicYearOption, AdmissionOptionItem } from '@/types/admission';
import { familyChildDisplayName } from '../utils/family-admission-child-intake';
import type { FamilyAdmissionChildFormState } from '../utils/family-admission-form-state';

export function FamilyAdmissionFamilyStep({
  family,
  guardians,
  children,
  onChangeFamily,
  onChangeGuardians,
  academicYears,
  sources,
  relationships,
  relationshipLoadFailed,
  relationshipsLoading,
}: {
  family: FamilyAdmissionFamilyFormState;
  guardians: GuardianDraft[];
  children: FamilyAdmissionChildFormState[];
  onChangeFamily: (patch: Partial<FamilyAdmissionFamilyFormState>) => void;
  onChangeGuardians: (next: GuardianDraft[]) => void;
  academicYears: AdmissionAcademicYearOption[];
  sources: AdmissionOptionItem[];
  relationships: AdmissionOptionItem[];
  relationshipLoadFailed: boolean;
  relationshipsLoading: boolean;
}) {
  const t = useT();
  const childrenOptions = children.map((child, index) => ({
    clientKey: child.localId,
    label:
      familyChildDisplayName(child) ||
      t('admin.admissions.family.childLabel', { index: index + 1 }),
  }));

  return (
    <section className="family-admission-step family-admission-family-step">
      <header className="family-admission-step__header">
        <h2 className="family-admission-step__title">{t('admin.admissions.family.familyStepTitle')}</h2>
        <p className="family-admission-step__lead">{t('admin.admissions.family.familyStepLead')}</p>
      </header>

      <div className="family-admission-card">
        <AdmissionGuardiansSection
          mode="family"
          guardians={guardians}
          onChange={onChangeGuardians}
          relationships={relationships}
          relationshipsLoading={relationshipsLoading}
          relationshipLoadFailed={relationshipLoadFailed}
          childrenOptions={childrenOptions}
        />

        <div className="student-create-form__grid family-admission-meta-grid">
          <div className="student-create-form__cell student-create-form__cell--full">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.family.sharedAddress')}
              </span>
              <input
                className="input"
                value={family.shared_address}
                onChange={(e) => onChangeFamily({ shared_address: e.target.value })}
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
                  onChangeFamily({
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
                  onChangeFamily({
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
                onChange={(first_contact_date) => onChangeFamily({ first_contact_date })}
              />
            </label>
          </div>

          <div className="student-create-form__cell student-create-form__cell--full">
            <label className="student-create-field">
              <span className="student-create-field__label">
                {t('admin.admissions.family.notes')}
              </span>
              <textarea
                className="input"
                rows={3}
                value={family.notes}
                onChange={(e) => onChangeFamily({ notes: e.target.value })}
                placeholder={t('admin.admissions.family.notesHint')}
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
