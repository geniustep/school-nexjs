import type { ReadinessStatus, SetupReadinessPayload } from '@/types/academic-setup';

export function readinessTone(
  status: ReadinessStatus,
  score: number,
): 'green' | 'amber' | 'red' | 'blue' | 'slate' {
  if (status === 'ready') return 'green';
  if (status === 'blocked') return 'red';
  if (status === 'needs_attention') return 'amber';
  if (status === 'incomplete') return 'blue';
  if (status === 'not_started') return 'slate';
  if (score >= 90) return 'amber';
  return 'blue';
}

export function readinessScoreLabel(
  data: SetupReadinessPayload,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const { score, status, blocking_issues: blocking } = data.readiness;
  if (status === 'blocked' && blocking > 0) {
    return t('admin.academicSetup.readinessScoreBlocked', { score, count: blocking });
  }
  return t('admin.academicSetup.readinessScorePlain', { score });
}

export function readinessStatusLabel(
  status: ReadinessStatus,
  t: (key: string) => string,
): string {
  const key = `admin.academicSetup.readinessStatus.${status}`;
  const msg = t(key);
  return msg !== key ? msg : status;
}

export function isStaffDomainUnavailable(domains: SetupReadinessPayload['domains']): boolean {
  return domains.staff === undefined;
}
