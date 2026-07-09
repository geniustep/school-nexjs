'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { useT } from '@/features/i18n/locale-context';
import { useLocale } from '@/features/i18n/locale-context';
import { localizeStudentGenderOptions } from '@/features/admin/students/utils/student-profile';
import {
  EnrollmentIntakeAcademicFields,
  EnrollmentIntakeIdentityFields,
} from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import type { EnrollmentIntakeAcademicOptions } from '@/features/admin/enrollment-intake/enrollment-intake-fields';
import type { StudentNationalityOption } from '@/types/student-360';
import type { AdmissionCycleOption, AdmissionLevelOption, AdmissionStreamOption } from '@/types/admission';
import {
  filterAdmissionCyclesByLevels,
  filterLevelsByCycle,
  filterStreamsByLevel,
  findAdmissionLevel,
} from '../utils/admission-options';
import {
  FAMILY_ADMISSION_MAX_CHILDREN,
  FAMILY_ADMISSION_MIN_CHILDREN,
  type FamilyAdmissionChildFormState,
} from '../utils/family-admission-form-state';
import {
  familyChildDisplayName,
  intakeFromFamilyChild,
  patchFamilyChildFromIntake,
} from '../utils/family-admission-child-intake';

export function FamilyAdmissionChildCard({
  child,
  index,
  sharedAddress,
  genders,
  nationalities,
  academic,
  allLevels,
  canRemove,
  onPatch,
  onToggleCollapsed,
  onRemove,
}: {
  child: FamilyAdmissionChildFormState;
  index: number;
  sharedAddress: string;
  genders: { value: string; label: string }[];
  nationalities: StudentNationalityOption[];
  academic: EnrollmentIntakeAcademicOptions;
  allLevels: AdmissionLevelOption[];
  canRemove: boolean;
  onPatch: (patch: Partial<FamilyAdmissionChildFormState>) => void;
  onToggleCollapsed: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const intakeValues = useMemo(() => intakeFromFamilyChild(child), [child]);
  const displayName = familyChildDisplayName(child);
  const levelLabel = useMemo(() => {
    const level = findAdmissionLevel(allLevels, child.requested_level_id);
    return level?.name ?? '';
  }, [allLevels, child.requested_level_id]);

  function handleIntakePatch(patch: Parameters<typeof patchFamilyChildFromIntake>[0]) {
    onPatch(patchFamilyChildFromIntake(patch));
  }

  return (
    <article
      className={cn(
        'family-admission-child-card',
        child.collapsed && 'family-admission-child-card--collapsed',
      )}
    >
      <header className="family-admission-child-card__header">
        <button
          type="button"
          className="family-admission-child-card__toggle"
          onClick={onToggleCollapsed}
          aria-expanded={!child.collapsed}
        >
          <span className="family-admission-child-card__index">
            {t('admin.admissions.family.childLabel', { index: index + 1 })}
          </span>
          <span className="family-admission-child-card__title">
            {displayName || t('admin.admissions.family.unnamedChild')}
          </span>
          {levelLabel ? (
            <span className="family-admission-child-card__level muted">{levelLabel}</span>
          ) : null}
          <span className="family-admission-child-card__chevron" aria-hidden>
            {child.collapsed ? '▾' : '▴'}
          </span>
        </button>
        {canRemove ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm family-admission-child-card__remove"
            onClick={onRemove}
          >
            {t('admin.admissions.family.removeChild')}
          </button>
        ) : null}
      </header>

      {!child.collapsed ? (
        <div className="family-admission-child-card__body" lang={locale}>
          <EnrollmentIntakeIdentityFields
            values={intakeValues}
            onPatch={handleIntakePatch}
            genders={genders}
            nationalities={nationalities}
            requireArabicNames
            intakeContext="admissionCreate"
          />

          <div className="student-create-form__grid">
            <div className="student-create-form__cell">
              <label className="student-create-field">
                <span className="student-create-field__label">
                  {t('admin.admissions.fields.massarCode')}
                </span>
                <input
                  className="input"
                  dir="ltr"
                  value={child.massar_code}
                  onChange={(e) => onPatch({ massar_code: e.target.value })}
                />
              </label>
            </div>
            <div className="student-create-form__cell">
              <label className="student-create-field">
                <span className="student-create-field__label">
                  {t('admin.admissions.fields.previousSchool')}
                </span>
                <input
                  className="input"
                  value={child.previous_school}
                  onChange={(e) => onPatch({ previous_school: e.target.value })}
                />
              </label>
            </div>
          </div>

          <EnrollmentIntakeAcademicFields
            values={intakeValues}
            onPatch={handleIntakePatch}
            academic={academic}
            intakeContext="admissionCreate"
          />

          <div className="family-admission-child-card__address">
            <label className="student-create-form__checkbox">
              <input
                type="checkbox"
                checked={child.use_different_address}
                onChange={(e) =>
                  onPatch({
                    use_different_address: e.target.checked,
                    residence_address: e.target.checked ? child.residence_address : '',
                  })
                }
              />
              <span>{t('admin.admissions.family.differentAddress')}</span>
            </label>
            {child.use_different_address ? (
              <label className="student-create-field">
                <span className="student-create-field__label">
                  {t('admin.admissions.family.childAddress')}
                </span>
                <input
                  className="input"
                  value={child.residence_address}
                  onChange={(e) => onPatch({ residence_address: e.target.value })}
                />
              </label>
            ) : sharedAddress.trim() ? (
              <p className="family-admission-child-card__inherited tiny muted">
                {t('admin.admissions.family.inheritsSharedAddress', {
                  address: sharedAddress.trim(),
                })}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function FamilyAdmissionChildrenStep({
  children,
  sharedAddress,
  genders,
  nationalities,
  allLevels,
  allStreams,
  cycles,
  optionsLoading,
  onPatchChild,
  onToggleChild,
  onRemoveChild,
  onAddChild,
}: {
  children: FamilyAdmissionChildFormState[];
  sharedAddress: string;
  genders: { value: string; label: string }[];
  nationalities: StudentNationalityOption[];
  allLevels: AdmissionLevelOption[];
  allStreams: AdmissionStreamOption[];
  cycles: AdmissionCycleOption[];
  optionsLoading: boolean;
  onPatchChild: (localId: string, patch: Partial<FamilyAdmissionChildFormState>) => void;
  onToggleChild: (localId: string) => void;
  onRemoveChild: (localId: string) => void;
  onAddChild: () => void;
}) {
  const t = useT();
  const localizedGenders = useMemo(
    () => localizeStudentGenderOptions(genders, t),
    [genders, t],
  );
  const canAdd = children.length < FAMILY_ADMISSION_MAX_CHILDREN;
  const canRemove = children.length > FAMILY_ADMISSION_MIN_CHILDREN;

  function buildAcademicOptions(child: FamilyAdmissionChildFormState): EnrollmentIntakeAcademicOptions {
    const filteredLevels = filterLevelsByCycle(allLevels, child.requested_cycle_code);
    const selectedLevel = findAdmissionLevel(allLevels, child.requested_level_id);
    const filteredStreams = filterStreamsByLevel(allStreams, child.requested_level_id);
    return {
      cycleMode: 'code',
      years: [],
      cycles: filterAdmissionCyclesByLevels(cycles, allLevels).map((cycle) => ({
        mode: 'code' as const,
        code: cycle.code,
        name: cycle.name,
      })),
      levels: filteredLevels,
      streams: filteredStreams,
      classes: [],
      registrationTypes: [],
      levelRequiresStream: Boolean(selectedLevel?.requires_stream),
      optionsLoading,
    };
  }

  return (
    <section className="family-admission-step family-admission-children-step">
      <header className="family-admission-step__header">
        <h2 className="family-admission-step__title">{t('admin.admissions.family.childrenStepTitle')}</h2>
        <p className="family-admission-step__lead">{t('admin.admissions.family.childrenStepLead')}</p>
      </header>

      <div className="family-admission-children-list">
        {children.map((child, index) => (
          <FamilyAdmissionChildCard
            key={child.localId}
            child={child}
            index={index}
            sharedAddress={sharedAddress}
            genders={localizedGenders}
            nationalities={nationalities}
            academic={buildAcademicOptions(child)}
            allLevels={allLevels}
            canRemove={canRemove}
            onPatch={(patch) => onPatchChild(child.localId, patch)}
            onToggleCollapsed={() => onToggleChild(child.localId)}
            onRemove={() => onRemoveChild(child.localId)}
          />
        ))}
      </div>

      {canAdd ? (
        <button type="button" className="btn btn--ghost family-admission-add-child" onClick={onAddChild}>
          + {t('admin.admissions.family.addChild')}
        </button>
      ) : null}
    </section>
  );
}
