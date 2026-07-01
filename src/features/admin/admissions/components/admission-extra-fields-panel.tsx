'use client';

import { useT } from '@/features/i18n/locale-context';
import type { SiblingsFieldsSource } from '@/types/sibling-line';
import { cleanDisplayValue } from '../utils/admission-labels';
import { OverviewCard, OverviewRow } from './admission-overview-primitives';

export interface AdmissionExtraFieldsSource extends SiblingsFieldsSource {
  external_reference?: string | null;
  residence_address?: string | null;
  previous_school?: string | null;
  internal_notes?: string | null;
}

export function AdmissionExtraFieldsPanel({ detail }: { detail: AdmissionExtraFieldsSource }) {
  const t = useT();

  return (
    <OverviewCard title={t('admin.admissions.extraFields.sectionTitle')}>
      <OverviewRow
        label={t('admin.admissions.extraFields.externalReference')}
        value={cleanDisplayValue(detail.external_reference)}
        dir="ltr"
      />
      <OverviewRow
        label={t('admin.admissions.extraFields.residenceAddress')}
        value={cleanDisplayValue(detail.residence_address)}
      />
      <OverviewRow
        label={t('admin.admissions.extraFields.previousSchool')}
        value={cleanDisplayValue(detail.previous_school)}
      />
      <OverviewRow
        label={t('admin.admissions.extraFields.internalNotes')}
        value={cleanDisplayValue(detail.internal_notes)}
      />
    </OverviewCard>
  );
}
