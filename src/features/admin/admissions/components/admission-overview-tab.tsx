'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  admissionStateTone,
  formatAdmissionReference,
  refName,
} from '../utils/admission-labels';
import { admissionUiStageTone, resolveAdmissionUiStage } from '../utils/admission-ui-stage';
import { AdmissionEditForm } from './admission-edit-form';
import { AdmissionNextActionBox } from './admission-next-action-box';
import { AdmissionExtraFieldsPanel } from './admission-extra-fields-panel';
import { SiblingsInfoPanel } from './siblings-info-panel';
import { AdmissionGuardiansDetails } from '@/features/admin/admissions/guardians';
import { OverviewCard, OverviewRow } from './admission-overview-primitives';
import { hasFamilyBatchLink } from '../utils/family-admission-visibility';
import { buildAdmissionTabHref } from '../utils/admission-detail-tabs';
import type { AdmissionDetail } from '@/types/admission';

export function AdmissionOverviewTab({
  detail,
  canEdit,
  editRequestSeq = 0,
  onUpdated,
}: {
  detail: AdmissionDetail;
  canEdit: boolean;
  editRequestSeq?: number;
  onUpdated: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const [editing, setEditing] = useState(false);
  const isFamilyChild = hasFamilyBatchLink(detail);

  useEffect(() => {
    if (!canEdit || editRequestSeq <= 0) return;
    setEditing(true);
  }, [canEdit, editRequestSeq]);

  if (editing) {
    return (
      <div className="admissions-overview admissions-overview--editing">
        <AdmissionEditForm
          detail={detail}
          onSaved={() => {
            setEditing(false);
            onUpdated();
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="admissions-overview">
      <AdmissionNextActionBox detail={detail} canEdit={canEdit} onUpdated={onUpdated} />

      <div className="admissions-overview-grid">
        <OverviewCard title={t('admin.admissions.detail.summary')}>
          <OverviewRow
            label={t('admin.admissions.table.reference')}
            value={<span className="mono">{formatAdmissionReference(detail.id, detail.reference)}</span>}
          />
          <OverviewRow
            label={t('admin.admissions.detail.pipelineStage')}
            value={
              <Badge tone={admissionUiStageTone(resolveAdmissionUiStage(detail))}>
                {t(`admin.admissions.uiStages.${resolveAdmissionUiStage(detail)}`)}
              </Badge>
            }
          />
          <OverviewRow
            label={t('admin.admissions.detail.detailedState')}
            value={
              <Badge tone={admissionStateTone(detail.state)}>
                {t(`admin.admissions.states.${detail.state}`)}
              </Badge>
            }
          />
          <OverviewRow label={t('admin.admissions.table.source')} value={refName(detail.source)} />
          <OverviewRow label={t('admin.admissions.fields.academicYear')} value={refName(detail.academic_year)} />
          <OverviewRow label={t('admin.admissions.table.assigned')} value={refName(detail.assigned_user)} />
          <OverviewRow label={t('admin.admissions.fields.priority')} value={detail.priority} />
          {detail.prefill_status ? (
            <OverviewRow label={t('admin.admissions.detail.prefillStatus')} value={detail.prefill_status} />
          ) : null}
        </OverviewCard>

        <OverviewCard title={t('admin.admissions.detail.student')}>
          <OverviewRow label={t('admin.admissions.fields.studentName')} value={detail.student_name} />
          <OverviewRow
            label={t('admin.admissions.fields.birthDate')}
            value={detail.birth_date ? formatDate(detail.birth_date) : null}
          />
          <OverviewRow
            label={t('admin.admissions.fields.gender')}
            value={detail.gender ? t(`admin.admissions.gender.${detail.gender}`) : null}
          />
          <OverviewRow label={t('admin.admissions.fields.massarCode')} value={detail.massar_code} dir="ltr" />
        </OverviewCard>

        {/* Family-batch guardians are rendered once in FamilyAdmissionFamilyPanel. */}
        {!isFamilyChild ? (
          <section className="card admissions-overview-card admissions-overview-card--full">
            <AdmissionGuardiansDetails
              mode="individual"
              guardians={detail.guardians}
              legacyFlat={{
                guardian_name: detail.guardian_name,
                guardian_phone: detail.guardian_phone,
                guardian_whatsapp: detail.guardian_whatsapp,
                guardian_email: detail.guardian_email,
                relationship: detail.relationship,
              }}
              warnings={detail.warning_details ?? null}
            />
          </section>
        ) : null}

        <OverviewCard title={t('admin.admissions.create.studySection')}>
          <OverviewRow label={t('admin.admissions.fields.academicYear')} value={refName(detail.academic_year)} />
          <OverviewRow label={t('admin.admissions.fields.requestedLevel')} value={refName(detail.requested_level)} />
          <OverviewRow label={t('admin.admissions.fields.requestedClass')} value={refName(detail.requested_class)} />
        </OverviewCard>

        <AdmissionExtraFieldsPanel detail={detail} />
        {isFamilyChild ? (
          <section className="card admissions-overview-card admissions-overview-card--full admissions-overview-family-pointer">
            <h2 className="admissions-overview-card__title">
              {t('admin.siblings.sectionTitle')}
            </h2>
            <p className="admissions-overview-family-pointer__text">
              {t('admin.admissions.family.siblingsInfoInFamilyTab')}
            </p>
            <Link
              href={buildAdmissionTabHref(detail.id, 'family_data')}
              className="btn btn--ghost btn--sm"
              data-testid="admissions-open-family-children"
            >
              {t('admin.admissions.family.openFamilyChildren')}
            </Link>
          </section>
        ) : (
          <SiblingsInfoPanel detail={detail} />
        )}

        {(detail.duplicates?.length ?? 0) > 0 ? (
          <section className="card admissions-overview-card admissions-overview-card--full">
            <h2 className="admissions-overview-card__title">
              {t('admin.admissions.detail.duplicates')}{' '}
              <Badge tone="amber">{detail.duplicate_count ?? detail.duplicates!.length}</Badge>
            </h2>
            <ul className="admissions-overview-duplicates">
              {detail.duplicates!.map((dup) => (
                <li key={dup.id}>
                  <Link href={`/admin/admissions/${dup.id}`}>
                    {dup.student_name} — {t(`admin.admissions.states.${dup.state}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
