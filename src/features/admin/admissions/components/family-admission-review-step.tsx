'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionLevelOption, AdmissionOptionItem, AdmissionAcademicYearOption } from '@/types/admission';
import type { FamilyAdmissionFormState } from '../utils/family-admission-form-state';
import { familyChildDisplayName } from '../utils/family-admission-child-intake';
import { findAdmissionLevel } from '../utils/admission-options';
import { admissionOptionId } from '../utils/admission-options';

export function FamilyAdmissionReviewStep({
  form,
  levels,
  sources,
  academicYears,
  onEditFamily,
  onEditChild,
  onAddChild,
}: {
  form: FamilyAdmissionFormState;
  levels: AdmissionLevelOption[];
  sources: AdmissionOptionItem[];
  academicYears: AdmissionAcademicYearOption[];
  onEditFamily: () => void;
  onEditChild: (localId: string) => void;
  onAddChild: () => void;
}) {
  const t = useT();
  const family = form.family;

  const academicYearLabel = useMemo(() => {
    const year = academicYears.find((y) => y.id === family.academic_year_id);
    return year?.name ?? '';
  }, [academicYears, family.academic_year_id]);

  const sourceLabel = useMemo(() => {
    const source = sources.find((s) => admissionOptionId(s) === family.source_id);
    return source?.label ?? '';
  }, [sources, family.source_id]);

  return (
    <section className="family-admission-step family-admission-review-step">
      <header className="family-admission-step__header">
        <h2 className="family-admission-step__title">{t('admin.admissions.family.reviewStepTitle')}</h2>
        <p className="family-admission-step__lead">{t('admin.admissions.family.reviewStepLead')}</p>
      </header>

      <div className="family-admission-review">
        <section className="family-admission-review__section">
          <div className="family-admission-review__section-head">
            <h3>{t('admin.admissions.family.reviewFamilySection')}</h3>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onEditFamily}>
              {t('admin.admissions.family.editFamily')}
            </button>
          </div>
          <div className="family-admission-review__hero">
            <strong>{family.guardian_name || t('common.dash')}</strong>
            <span className="muted">
              {t('admin.admissions.family.reviewChildCount', { count: form.children.length })}
            </span>
          </div>
          <dl className="family-admission-review__facts">
            {family.guardian_phone ? (
              <div>
                <dt>{t('admin.admissions.fields.guardianPhone')}</dt>
                <dd dir="ltr">{family.guardian_phone}</dd>
              </div>
            ) : null}
            {family.guardian_whatsapp ? (
              <div>
                <dt>{t('admin.admissions.fields.guardianWhatsapp')}</dt>
                <dd dir="ltr">{family.guardian_whatsapp}</dd>
              </div>
            ) : null}
            {family.guardian_email ? (
              <div>
                <dt>{t('admin.admissions.fields.guardianEmail')}</dt>
                <dd dir="ltr">{family.guardian_email}</dd>
              </div>
            ) : null}
            {family.shared_address ? (
              <div>
                <dt>{t('admin.admissions.family.sharedAddress')}</dt>
                <dd>{family.shared_address}</dd>
              </div>
            ) : null}
            {academicYearLabel ? (
              <div>
                <dt>{t('admin.admissions.fields.academicYear')}</dt>
                <dd>{academicYearLabel}</dd>
              </div>
            ) : null}
            {sourceLabel ? (
              <div>
                <dt>{t('admin.admissions.fields.source')}</dt>
                <dd>{sourceLabel}</dd>
              </div>
            ) : null}
            {family.notes.trim() ? (
              <div>
                <dt>{t('admin.admissions.family.notes')}</dt>
                <dd dir="auto">{family.notes.trim()}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="family-admission-review__section">
          <div className="family-admission-review__section-head">
            <h3>{t('admin.admissions.family.reviewChildrenSection')}</h3>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onAddChild}>
              + {t('admin.admissions.family.addChild')}
            </button>
          </div>
          <ol className="family-admission-review__children">
            {form.children.map((child, index) => {
              const name = familyChildDisplayName(child) || t('admin.admissions.family.unnamedChild');
              const level = findAdmissionLevel(levels, child.requested_level_id);
              return (
                <li key={child.localId} className="family-admission-review__child">
                  <div className="family-admission-review__child-main">
                    <span className="family-admission-review__child-index">{index + 1}.</span>
                    <div>
                      <strong>{name}</strong>
                      {level?.name ? (
                        <span className="family-admission-review__child-level muted">{level.name}</span>
                      ) : null}
                      {child.use_different_address && child.residence_address.trim() ? (
                        <Badge tone="slate">{t('admin.admissions.family.customAddressBadge')}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => onEditChild(child.localId)}
                  >
                    {t('admin.admissions.family.editChild')}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <p className="family-admission-review__submit-hint muted">
          {t('admin.admissions.family.submitHint')}
        </p>
      </div>
    </section>
  );
}
