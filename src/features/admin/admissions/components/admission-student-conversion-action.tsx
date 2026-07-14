'use client';

import Link from 'next/link';
import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail } from '@/types/admission';
import {
  hasModernContract,
  resolveStudentNavigation,
} from '../utils/admission-modern-actions';
import { resolveApplicationStatus } from '../utils/admission-modern-status';
import {
  buildContinueRegistrationHref,
  buildOpenStudentHref,
  canConvertAdmissionToStudentAnyStage,
  isAdmissionLinked,
  resolveAdmissionStudentId,
  shouldShowEarlyStudentConversionHint,
} from '../utils/admission-registration';

/**
 * Header open-student / legacy convert control.
 * Modern convert CTA lives only on AdmissionPrimaryActionPanel
 * (primary or always-visible secondary) — never duplicated here.
 */
export function AdmissionStudentConversionAction({
  detail,
}: {
  detail: AdmissionDetail;
  onUpdated?: () => void;
}) {
  const t = useT();
  const modern = hasModernContract(detail);
  const status = resolveApplicationStatus(detail);
  const studentNav = resolveStudentNavigation(detail.navigation, detail.student_id);
  const studentId = resolveAdmissionStudentId(detail.student_id);
  const linked = isAdmissionLinked(detail) || status === 'registered';

  if (linked || status === 'registered') {
    const href = studentNav?.href ?? (studentId != null ? buildOpenStudentHref(studentId) : null);
    if (!href) return null;
    return (
      <div className="admission-student-conversion" data-testid="admission-open-student-action">
        <Link
          href={href}
          className="btn btn--secondary btn--sm"
          data-testid="admission-open-student-button"
        >
          {t('admin.admissions.registration.openStudentProfile')}
        </Link>
      </div>
    );
  }

  // Modern board: convert is rendered once in the primary-action panel.
  if (modern) return null;

  if (!canConvertAdmissionToStudentAnyStage(detail)) {
    return null;
  }

  const showHint = shouldShowEarlyStudentConversionHint(detail);

  return (
    <div className="admission-student-conversion" data-testid="admission-convert-to-student-action">
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
