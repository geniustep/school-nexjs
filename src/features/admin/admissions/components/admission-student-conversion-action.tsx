'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { InfoBanner } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail } from '@/types/admission';
import { executeAdmissionAction } from '../api/admissions-api';
import { mapAdmissionActionError } from '../utils/admission-action-errors';
import {
  hasModernContract,
  isModernActionAllowed,
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
 * Convert / open-student control on the admission detail surface.
 * Modern contract: convert_to_student via /actions; open student via navigation.
 */
export function AdmissionStudentConversionAction({
  detail,
  onUpdated,
}: {
  detail: AdmissionDetail;
  onUpdated?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { activeSchoolId } = useAdminSession();
  const [busy, setBusy] = useState(false);
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

  if (modern) {
    const canConvert = isModernActionAllowed(detail.modern_allowed_actions, 'convert_to_student');
    if (!canConvert) return null;

    async function handleConvert() {
      if (activeSchoolId == null || busy) return;
      setBusy(true);
      const res = await executeAdmissionAction(
        detail.id,
        { action: 'convert_to_student' },
        { active_school_id: activeSchoolId },
      );
      setBusy(false);
      if (!res.success) {
        const mapped = mapAdmissionActionError(res.error);
        toast.error(mapped.startsWith('admin.') ? t(mapped) : mapped);
        return;
      }
      onUpdated?.();
      router.push(buildContinueRegistrationHref(detail.id));
    }

    return (
      <div className="admission-student-conversion" data-testid="admission-convert-to-student-action">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          data-testid="admission-convert-to-student-button"
          disabled={busy}
          onClick={() => void handleConvert()}
        >
          {t('admin.admissions.actions.convertToStudent')}
        </button>
      </div>
    );
  }

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
