'use client';

import type { ReactNode } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SiblingsFieldsSource } from '@/types/sibling-line';

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

export interface AdmissionExtraFieldsSource extends SiblingsFieldsSource {
  external_reference?: string | null;
  residence_address?: string | null;
  previous_school?: string | null;
  internal_notes?: string | null;
}

export function AdmissionExtraFieldsPanel({ detail }: { detail: AdmissionExtraFieldsSource }) {
  const t = useT();
  const empty = t('admin.admissions.extraFields.notMentioned');

  return (
    <OverviewCard title={t('admin.admissions.extraFields.sectionTitle')}>
      <OverviewRow
        label={t('admin.admissions.extraFields.externalReference')}
        value={detail.external_reference?.trim() || empty}
        dir="ltr"
      />
      <OverviewRow
        label={t('admin.admissions.extraFields.residenceAddress')}
        value={detail.residence_address?.trim() || empty}
      />
      <OverviewRow
        label={t('admin.admissions.extraFields.previousSchool')}
        value={detail.previous_school?.trim() || empty}
      />
      <OverviewRow
        label={t('admin.admissions.extraFields.internalNotes')}
        value={detail.internal_notes?.trim() || empty}
      />
    </OverviewCard>
  );
}
