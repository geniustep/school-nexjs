import type { ReadinessStatus, SetupReadinessPayload } from '@/types/academic-setup';

const KNOWN_READINESS_STATUSES = new Set<ReadinessStatus>([
  'not_started',
  'incomplete',
  'needs_attention',
  'ready',
  'blocked',
]);

/**
 * Some readiness payloads leak issue codes into domain.status
 * (e.g. `assignment_missing`). Coerce those to a real readiness status.
 */
export function normalizeReadinessStatus(
  status: string | null | undefined,
  score = 0,
): ReadinessStatus {
  const raw = String(status ?? '').trim().toLowerCase();
  if (KNOWN_READINESS_STATUSES.has(raw as ReadinessStatus)) {
    return raw as ReadinessStatus;
  }

  // Unknown values are usually leaked issue codes — never surface them raw.
  if (score >= 100) return 'ready';
  if (score > 0 && score < 40) return 'blocked';
  if (score >= 40 && score < 90) return 'needs_attention';
  if (score >= 90) return 'incomplete';
  return 'needs_attention';
}

export function readinessTone(
  status: string | ReadinessStatus,
  score: number,
): 'green' | 'amber' | 'red' | 'blue' | 'slate' {
  const normalized = normalizeReadinessStatus(status, score);
  if (normalized === 'ready') return 'green';
  if (normalized === 'blocked') return 'red';
  if (normalized === 'needs_attention') return 'amber';
  if (normalized === 'incomplete') return 'blue';
  if (normalized === 'not_started') return 'slate';
  if (score >= 90) return 'amber';
  return 'blue';
}

export function readinessScoreLabel(
  data: SetupReadinessPayload,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const { score, status, blocking_issues: blocking } = data.readiness;
  const normalized = normalizeReadinessStatus(status, score);
  if (normalized === 'blocked' && blocking > 0) {
    return t('admin.academicSetup.readinessScoreBlocked', { score, count: blocking });
  }
  return t('admin.academicSetup.readinessScorePlain', { score });
}

export function readinessStatusLabel(
  status: string | ReadinessStatus,
  t: (key: string) => string,
  score = 0,
): string {
  const normalized = normalizeReadinessStatus(status, score);
  const key = `admin.academicSetup.readinessStatus.${normalized}`;
  const msg = t(key);
  return msg !== key ? msg : normalized;
}

export function isStaffDomainUnavailable(domains: SetupReadinessPayload['domains']): boolean {
  return domains.staff === undefined;
}
