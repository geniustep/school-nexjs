import type { ApiWarning } from '@/types/academic-setup';

export function mapStaffWarningCode(code: string, t: (key: string) => string): string {
  const key = `admin.staffCenter.warnings.${code}`;
  const msg = t(key);
  return msg !== key ? msg : code;
}

export function normalizeStaffWarnings(raw: unknown): ApiWarning[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is ApiWarning => !!item && typeof item === 'object' && typeof item.code === 'string')
    .map((item) => ({
      code: item.code,
      message: typeof item.message === 'string' ? item.message : undefined,
      severity: item.severity,
    }));
}

export function staffWarningCount(member: { warnings?: ApiWarning[] }): number {
  return member.warnings?.length ?? 0;
}
