'use client';

import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import {
  admissionStateTone,
  formatAdmissionReference,
  refName,
} from '../utils/admission-labels';
import { AdmissionNextActionBox } from './admission-next-action-box';
import type { AdmissionDetail } from '@/types/admission';

export function AdmissionOverviewTab({
  detail,
  canEdit,
  onUpdated,
}: {
  detail: AdmissionDetail;
  canEdit: boolean;
  onUpdated: () => void;
}) {
  const t = useT();

  return (
    <div className="admissions-section">
      <AdmissionNextActionBox detail={detail} canEdit={canEdit} onUpdated={onUpdated} />

      <section>
        <h2 className="admissions-section__title">{t('admin.admissions.detail.summary')}</h2>
        <dl className="admissions-dl">
          <dt>{t('admin.admissions.table.reference')}</dt>
          <dd>{formatAdmissionReference(detail.id, detail.reference)}</dd>
          <dt>{t('admin.admissions.table.state')}</dt>
          <dd>
            <Badge tone={admissionStateTone(detail.state)}>
              {t(`admin.admissions.states.${detail.state}`)}
            </Badge>
          </dd>
          <dt>{t('admin.admissions.table.source')}</dt>
          <dd>{refName(detail.source) || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.academicYear')}</dt>
          <dd>{refName(detail.academic_year) || t('common.dash')}</dd>
          <dt>{t('admin.admissions.table.assigned')}</dt>
          <dd>{refName(detail.assigned_user) || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.priority')}</dt>
          <dd>{detail.priority || t('common.dash')}</dd>
          {detail.prefill_status && (
            <>
              <dt>{t('admin.admissions.detail.prefillStatus')}</dt>
              <dd>{detail.prefill_status}</dd>
            </>
          )}
        </dl>
      </section>

      <section>
        <h2 className="admissions-section__title">{t('admin.admissions.detail.student')}</h2>
        <dl className="admissions-dl">
          <dt>{t('admin.admissions.fields.studentName')}</dt>
          <dd>{detail.student_name}</dd>
          <dt>{t('admin.admissions.fields.birthDate')}</dt>
          <dd>{detail.birth_date || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.gender')}</dt>
          <dd>
            {detail.gender
              ? t(`admin.admissions.gender.${detail.gender}`)
              : t('common.dash')}
          </dd>
          <dt>{t('admin.admissions.fields.requestedLevel')}</dt>
          <dd>{refName(detail.requested_level) || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.requestedClass')}</dt>
          <dd>{refName(detail.requested_class) || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.previousSchool')}</dt>
          <dd>{detail.previous_school || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.massarCode')}</dt>
          <dd>{detail.massar_code || t('common.dash')}</dd>
        </dl>
      </section>

      <section>
        <h2 className="admissions-section__title">{t('admin.admissions.detail.guardian')}</h2>
        <dl className="admissions-dl">
          <dt>{t('admin.admissions.fields.guardianName')}</dt>
          <dd>{detail.guardian_name || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.guardianPhone')}</dt>
          <dd dir="ltr">{detail.guardian_phone || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.guardianWhatsapp')}</dt>
          <dd dir="ltr">{detail.guardian_whatsapp || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.guardianEmail')}</dt>
          <dd dir="ltr">{detail.guardian_email || t('common.dash')}</dd>
          <dt>{t('admin.admissions.fields.relationship')}</dt>
          <dd>{detail.relationship || t('common.dash')}</dd>
        </dl>
      </section>

      {(detail.duplicates?.length ?? 0) > 0 && (
        <section>
          <h2 className="admissions-section__title">
            {t('admin.admissions.detail.duplicates')}{' '}
            <Badge tone="amber">{detail.duplicate_count ?? detail.duplicates!.length}</Badge>
          </h2>
          <ul>
            {detail.duplicates!.map((dup) => (
              <li key={dup.id}>
                <a href={`/admin/admissions/${dup.id}`}>
                  {dup.student_name} — {dup.state}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail.internal_notes && (
        <section>
          <h2 className="admissions-section__title">{t('admin.admissions.fields.internalNotes')}</h2>
          <p>{detail.internal_notes}</p>
        </section>
      )}
    </div>
  );
}
