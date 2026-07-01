'use client';

import Link from 'next/link';
import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail } from '@/types/admission';
import {
  buildContinueRegistrationHref,
  canContinueStudentRegistration,
  hasAdmissionReadinessWarnings,
  isAdmissionLinked,
  resolveAdmissionStudentId,
} from '../utils/admission-registration';
import {
  resolveAdmissionBlockingIssues,
  shouldBlockStudentConversion,
} from '../utils/admission-rejection';
import { formatPrefillMessage } from '../utils/admission-prefill-display';

export function AdmissionRegistrationActions({ detail }: { detail: AdmissionDetail }) {
  const t = useT();
  const studentId = resolveAdmissionStudentId(detail.student_id);
  const linked = isAdmissionLinked(detail);
  const canContinue = canContinueStudentRegistration(detail);
  const blocked = shouldBlockStudentConversion(detail);
  const showReadinessWarning = canContinue && hasAdmissionReadinessWarnings(detail);
  const blockingIssues = resolveAdmissionBlockingIssues(detail);

  if (linked && studentId) {
    return (
      <div className="admissions-registration-actions admissions-registration-actions--linked">
        <InfoBanner
          tone="green"
          title={t('admin.admissions.registration.linkedTitle')}
          description={t('admin.admissions.registration.linkedDescription')}
        />
        <Link href={`/admin/students/${studentId}`} className="btn btn--primary btn--sm">
          {t('admin.admissions.registration.openStudentProfile')}
        </Link>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="admissions-registration-actions admissions-registration-actions--blocked">
        <InfoBanner
          tone="amber"
          title={t('admin.admissions.registration.continueButton')}
          description={t('admin.admissions.rejection.cannotLinkStudent')}
        />
        {blockingIssues.length > 0 ? (
          <div className="alert alert--error admissions-registration-actions__alert" role="alert">
            <strong>{t('admin.admissions.prefill.blockingIssues')}</strong>
            <ul>
              {blockingIssues.map((issue, index) => (
                <li key={index}>{formatPrefillMessage(issue, t)}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  if (!canContinue) return null;

  return (
    <div className="admissions-registration-actions">
      {showReadinessWarning ? (
        <div className="alert alert--warning admissions-registration-actions__alert" role="status">
          {t('admin.admissions.registration.readinessWarning')}
        </div>
      ) : null}
      <Link href={buildContinueRegistrationHref(detail.id)} className="btn btn--primary">
        {t('admin.admissions.registration.continueButton')}
      </Link>
    </div>
  );
}
