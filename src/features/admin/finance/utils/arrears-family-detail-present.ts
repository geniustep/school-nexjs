import type { ArrearsOverdueInstallmentDetail } from '@/types/finance-arrears';

const RELATIONSHIP_TYPES = new Set([
  'father',
  'mother',
  'legal_guardian',
  'grandfather',
  'grandmother',
  'brother',
  'sister',
  'uncle',
  'aunt',
  'other',
]);

export function arrearsReferenceLabel(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '—';
  const record = value as Record<string, unknown>;
  for (const key of ['display_name', 'display_label', 'name', 'display_code', 'code']) {
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return '—';
}

export function arrearsGuardianRelationshipLabelKey(
  value: string | null | undefined,
): string | null {
  if (!value || !RELATIONSHIP_TYPES.has(value)) return null;
  return `admin.finance.arrears.familyDetails.relationshipTypes.${value}`;
}

export type ArrearsInstallmentPeriodGroup = {
  key: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  items: ArrearsOverdueInstallmentDetail[];
};

export function groupArrearsInstallmentsByPeriod(
  rows: ArrearsOverdueInstallmentDetail[] | null | undefined,
): ArrearsInstallmentPeriodGroup[] {
  const groups = new Map<string, ArrearsInstallmentPeriodGroup>();
  for (const row of rows ?? []) {
    const key = row.period_key ?? row.period_start?.slice(0, 7) ?? row.due_date?.slice(0, 7) ?? 'unknown';
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(row);
    } else {
      groups.set(key, { key, periodStart: row.period_start, periodEnd: row.period_end, items: [row] });
    }
  }
  return Array.from(groups.values());
}
