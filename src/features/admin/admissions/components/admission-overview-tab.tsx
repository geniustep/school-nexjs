'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import {
  admissionStateTone,
  formatAdmissionReference,
  refName,
} from '../utils/admission-labels';
import { AdmissionNextActionBox } from './admission-next-action-box';
import { AdmissionExtraFieldsPanel } from './admission-extra-fields-panel';
import { SiblingsInfoPanel } from './siblings-info-panel';
import type { AdmissionDetail } from '@/types/admission';

function OverviewCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card admissions-overview-card">
      <h2 className="admissions-overview-card__title">{title}</h2>
      <dl className="admissions-overview-card__dl">{children}</dl>
    </section>
  );
}

function OverviewRow({
  label,
  value,
  dir,
}: {
  label: string;
  value: ReactNode;
  dir?: 'ltr' | 'rtl' | 'auto';
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd dir={dir}>{value}</dd>
    </>
  );
}

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
  const { formatDate } = useFormat();
  const empty = t('admin.admissions.detail.unspecified');

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
            label={t('admin.admissions.table.state')}
            value={
              <Badge tone={admissionStateTone(detail.state)}>
                {t(`admin.admissions.states.${detail.state}`)}
              </Badge>
            }
          />
          <OverviewRow label={t('admin.admissions.table.source')} value={refName(detail.source) || empty} />
          <OverviewRow
            label={t('admin.admissions.fields.academicYear')}
            value={refName(detail.academic_year) || empty}
          />
          <OverviewRow
            label={t('admin.admissions.table.assigned')}
            value={refName(detail.assigned_user) || empty}
          />
          <OverviewRow label={t('admin.admissions.fields.priority')} value={detail.priority || empty} />
          {detail.prefill_status ? (
            <OverviewRow
              label={t('admin.admissions.detail.prefillStatus')}
              value={detail.prefill_status}
            />
          ) : null}
        </OverviewCard>

        <OverviewCard title={t('admin.admissions.detail.student')}>
          <OverviewRow label={t('admin.admissions.fields.studentName')} value={detail.student_name} />
          <OverviewRow
            label={t('admin.admissions.fields.birthDate')}
            value={detail.birth_date ? formatDate(detail.birth_date) : empty}
          />
          <OverviewRow
            label={t('admin.admissions.fields.gender')}
            value={
              detail.gender ? t(`admin.admissions.gender.${detail.gender}`) : empty
            }
          />
          <OverviewRow
            label={t('admin.admissions.fields.massarCode')}
            value={detail.massar_code || empty}
            dir="ltr"
          />
        </OverviewCard>

        <OverviewCard title={t('admin.admissions.detail.guardian')}>
          <OverviewRow
            label={t('admin.admissions.fields.guardianName')}
            value={detail.guardian_name || empty}
          />
          <OverviewRow
            label={t('admin.admissions.fields.guardianPhone')}
            value={detail.guardian_phone || empty}
            dir="ltr"
          />
          <OverviewRow
            label={t('admin.admissions.fields.guardianWhatsapp')}
            value={detail.guardian_whatsapp || empty}
            dir="ltr"
          />
          <OverviewRow
            label={t('admin.admissions.fields.guardianEmail')}
            value={detail.guardian_email || empty}
            dir="ltr"
          />
          <OverviewRow
            label={t('admin.admissions.fields.relationship')}
            value={detail.relationship || empty}
          />
        </OverviewCard>

        <OverviewCard title={t('admin.admissions.create.studySection')}>
          <OverviewRow
            label={t('admin.admissions.fields.academicYear')}
            value={refName(detail.academic_year) || empty}
          />
          <OverviewRow
            label={t('admin.admissions.fields.requestedLevel')}
            value={refName(detail.requested_level) || empty}
          />
          <OverviewRow
            label={t('admin.admissions.fields.requestedClass')}
            value={refName(detail.requested_class) || empty}
          />
        </OverviewCard>
      </div>

      <AdmissionExtraFieldsPanel detail={detail} />
      <SiblingsInfoPanel detail={detail} />

      {(detail.duplicates?.length ?? 0) > 0 && (
        <section className="card admissions-overview-card">
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
      )}

    </div>
  );
}
