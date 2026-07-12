'use client';

import { AdmissionAppointmentsTab } from './admission-appointments-tab';
import { AdmissionAssessmentsTab } from './admission-assessments-tab';
import type { AdmissionDetail } from '@/types/admission';
import { useT } from '@/features/i18n/locale-context';

export function AdmissionAssessmentsAppointmentsTab({
  detail,
  canCreateAppointment,
  canCreateAssessment,
  onUpdated,
}: {
  detail: AdmissionDetail;
  canCreateAppointment: boolean;
  canCreateAssessment: boolean;
  onUpdated: () => void;
}) {
  const t = useT();
  return (
    <div className="admission-merged-tab" data-testid="admission-tab-assessments-appointments">
      <section className="admission-merged-tab__section">
        <h3 className="admission-merged-tab__heading">
          {t('admin.admissions.tabs.assessmentsSection')}
        </h3>
        <AdmissionAssessmentsTab
          detail={detail}
          canCreate={canCreateAssessment}
          onUpdated={onUpdated}
        />
      </section>
      <section className="admission-merged-tab__section">
        <h3 className="admission-merged-tab__heading">
          {t('admin.admissions.tabs.appointmentsSection')}
        </h3>
        <AdmissionAppointmentsTab
          detail={detail}
          canCreate={canCreateAppointment}
          onUpdated={onUpdated}
        />
      </section>
    </div>
  );
}
