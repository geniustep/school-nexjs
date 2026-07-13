'use client';

import Link from 'next/link';
import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail } from '@/types/admission';
import {
  buildContinueRegistrationHref,
  buildOpenStudentHref,
  canConvertAdmissionToStudentAnyStage,
  isAdmissionLinked,
  resolveAdmissionStudentId,
  shouldShowEarlyStudentConversionHint,
} from '../utils/admission-registration';

/**
 * Always-visible convert / open-student control on the admission detail surface.
 * Independent of the dynamic primary-action label (assessment CTAs stay elsewhere).
 */
export function AdmissionStudentConversionAction({
  detail,
}: {
  detail: AdmissionDetail;
}) {
  const t = useT();
  const studentId = resolveAdmissionStudentId(detail.student_id);
  const linked = isAdmissionLinked(detail);

  if (linked && studentId) {
    return (
      <div
        className="admission-student-conversion"
        data-testid="admission-open-student-action"
      >
        <Link
          href={buildOpenStudentHref(studentId)}
          className="btn btn--secondary btn--sm"
          data-testid="admission-open-student-button"
        >
          {t('admin.admissions.registration.openStudentProfile')}
        </Link>
      </div>
    );
  }

  if (!canConvertAdmissionToStudentAnyStage(detail)) {
    return null;
  }

  const showHint = shouldShowEarlyStudentConversionHint(detail);

  return (
    <div
      className="admission-student-conversion"
      data-testid="admission-convert-to-student-action"
    >
      {showHint ? (
        <InfoBanner
          tone="amber"
          title={t('admin.admissions.registration.convertToStudent')}
          description={t('admin.admissions.registration.convertIncompleteHint')}
        />
      ) : null}
      <Link
        href={buildContinueRegistrationHref(detail.id)}
        className="btn btn--secondary btn--sm"
        data-testid="admission-convert-to-student-button"
      >
        {t('admin.admissions.registration.convertToStudent')}
      </Link>
    </div>
  );
}
