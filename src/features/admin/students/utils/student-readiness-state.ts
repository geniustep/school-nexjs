import type { StudentDetailsData } from '@/types/student-360';
import { isRelationshipActive } from './relationship-types';

export type ProfileReadinessState = 'draft' | 'in_progress' | 'ready';

function hasBasicIdentity(details: StudentDetailsData): boolean {
  const s = details.student;
  return Boolean(s.first_name?.trim() && s.last_name?.trim());
}

function hasEnrollment(details: StudentDetailsData): boolean {
  const e = details.current_enrollment;
  return Boolean(e && e.level);
}

function hasGuardian(details: StudentDetailsData): boolean {
  return details.guardian_relationships.some((r) => isRelationshipActive(r.state, r.active));
}

export function computeProfileReadinessState(
  details: StudentDetailsData,
  opts?: { requireClass?: boolean },
): ProfileReadinessState {
  if (!hasBasicIdentity(details)) return 'draft';

  const enrollment = details.current_enrollment;
  const enrollmentComplete =
    hasEnrollment(details) &&
    (!opts?.requireClass || Boolean(enrollment?.class));

  const docSummary = details.document_summary;
  const docsOk = !docSummary || docSummary.missing_required === 0;
  const healthOk = details.health_summary?.has_profile === true;
  const hasGuardianLink = hasGuardian(details);

  const criticalComplete =
    enrollmentComplete && hasGuardianLink && docsOk && healthOk;

  if (criticalComplete) return 'ready';
  return 'in_progress';
}
