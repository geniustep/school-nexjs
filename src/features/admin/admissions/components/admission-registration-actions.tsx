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

export function AdmissionRegistrationActions({ detail }: { detail: AdmissionDetail }) {
  const t = useT();
  const studentId = resolveAdmissionStudentId(detail.student_id);
  const linked = isAdmissionLinked(detail);
  const canContinue = canContinueStudentRegistration(detail);
  const showReadinessWarning = canContinue && hasAdmissionReadinessWarnings(detail);

  if (linked && studentId) {
    return (
      <div className="admissions-registration-actions">
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

  if (!canContinue) return null;

  return (
    <div className="admissions-registration-actions">
      {showReadinessWarning ? (
        <p className="admissions-registration-actions__warning" role="status">
          {t('admin.admissions.registration.readinessWarning')}
        </p>
      ) : null}
      <Link
        href={buildContinueRegistrationHref(detail.id)}
        className="btn btn--primary"
      >
        {t('admin.admissions.registration.continueButton')}
      </Link>
    </div>
  );
}
