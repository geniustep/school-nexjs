'use client';

import { AdmissionAppointmentsTab } from './admission-appointments-tab';
import { AdmissionAssessmentsTab } from './admission-assessments-tab';
import type { AdmissionDetail } from '@/types/admission';
import { useT } from '@/features/i18n/locale-context';
import {
  assessmentProgressLabelKey,
  assessmentRecommendationLabelKey,
  assessmentTypeLabelKey,
  resolveAssessmentProgress,
} from '../utils/admission-assessment-workflow-contract';

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
  const progress =
    resolveAssessmentProgress(detail) ?? detail.assessment_summary?.progress ?? null;
  const summary = detail.assessment_summary;
  const required = summary?.required_count ?? null;
  const completed = summary?.completed_count ?? null;
  const open = summary?.open_count ?? null;
  const next = summary?.next_assessment as
    | { assessment_type?: string; recommendation?: string }
    | null
    | undefined;

  return (
    <div className="admission-merged-tab" data-testid="admission-tab-assessments-appointments">
      <section className="admission-merged-tab__section">
        <h3 className="admission-merged-tab__heading">
          {t('admin.admissions.assessmentSummary.title')}
        </h3>
        {progress ? (
          <p className="muted tiny" data-testid="assessment-progress">
            {t(assessmentProgressLabelKey(String(progress)))}
          </p>
        ) : null}
        {required != null || completed != null ? (
          <p className="muted tiny" data-testid="assessment-counts">
            {t('admin.admissions.assessmentSummary.completedCount')}: {completed ?? 0}
            {' / '}
            {t('admin.admissions.assessmentSummary.requiredCount')}: {required ?? 0}
            {open != null
              ? ` · ${t('admin.admissions.assessmentSummary.openCount')}: ${open}`
              : null}
          </p>
        ) : null}
        {next?.assessment_type ? (
          <p className="muted tiny" data-testid="assessment-next">
            {t('admin.admissions.assessmentSummary.nextAssessment')}:{' '}
            {t(assessmentTypeLabelKey(String(next.assessment_type)))}
          </p>
        ) : null}
        <p className="muted tiny">
          {t('admin.admissions.assessmentRecommendations.recommendationNote')}
        </p>
        <span className="sr-only">{t(assessmentRecommendationLabelKey('suitable'))}</span>
      </section>

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
