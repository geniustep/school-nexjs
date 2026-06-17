import { normalizeFeePlanLines } from '@/lib/utils/fee-plan-line-normalize';
import type {
  FeePlan,
  FeePlanAllowedActionsMap,
  FeePlanUsage,
  FeePlanUsageSummary,
} from '@/types/finance';

export type FeePlanLifecycleAction = keyof FeePlanAllowedActionsMap;

export const FEE_PLAN_LIFECYCLE_ERROR_CODES = [
  'fee_plan_reset_forbidden_in_use',
  'fee_plan_restore_forbidden',
  'fee_plan_in_use',
  'fee_plan_delete_forbidden_state',
  'forbidden',
] as const;

export type FeePlanLifecycleErrorCode = (typeof FEE_PLAN_LIFECYCLE_ERROR_CODES)[number];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
}

export function normalizeFeePlanUsage(raw: unknown): FeePlanUsage | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;

  const usage: FeePlanUsage = {
    agreement_count: asNumber(record.agreement_count),
    student_fee_count: asNumber(record.student_fee_count),
    installment_count: asNumber(record.installment_count),
    collection_count: asNumber(record.collection_count),
    receipt_count: asNumber(record.receipt_count),
    assigned_student_count: asNumber(record.assigned_student_count),
    is_used: asBoolean(record.is_used),
    student_count: asNumber(record.student_count ?? record.assigned_student_count),
  };

  const hasAny =
    usage.is_used != null ||
    usage.agreement_count != null ||
    usage.student_fee_count != null ||
    usage.installment_count != null ||
    usage.collection_count != null ||
    usage.receipt_count != null ||
    usage.assigned_student_count != null ||
    usage.student_count != null;

  return hasAny ? usage : undefined;
}

export function normalizeFeePlanUsageSummary(raw: unknown): FeePlanUsageSummary | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  return normalizeFeePlanUsage(record);
}

const ALLOWED_ACTION_KEYS: FeePlanLifecycleAction[] = [
  'view',
  'edit',
  'confirm',
  'reset_to_draft',
  'duplicate',
  'archive',
  'restore',
  'delete',
  'assign',
  'view_usage',
];

export function normalizeFeePlanAllowedActions(raw: unknown): FeePlanAllowedActionsMap | undefined {
  if (raw == null) return undefined;

  if (Array.isArray(raw)) {
    const map: FeePlanAllowedActionsMap = {};
    for (const entry of raw) {
      if (typeof entry === 'string' && ALLOWED_ACTION_KEYS.includes(entry as FeePlanLifecycleAction)) {
        map[entry as FeePlanLifecycleAction] = true;
      }
    }
    return map;
  }

  const record = asRecord(raw);
  if (!record) return undefined;

  const map: FeePlanAllowedActionsMap = {};
  for (const key of ALLOWED_ACTION_KEYS) {
    const value = asBoolean(record[key]);
    if (value != null) map[key] = value;
  }
  return map;
}

export function normalizeFeePlan(raw: unknown): FeePlan | null {
  const record = asRecord(raw);
  if (!record || asNumber(record.id) == null) return null;

  const lines = record.lines != null ? normalizeFeePlanLines(record.lines) : undefined;

  return {
    ...(record as unknown as FeePlan),
    id: Number(record.id),
    code: typeof record.code === 'string' ? record.code : '',
    name: typeof record.name === 'string' ? record.name : '',
    school_id: asNumber(record.school_id) ?? 0,
    state: record.state as FeePlan['state'],
    lines,
    usage: normalizeFeePlanUsage(record.usage),
    usage_summary: normalizeFeePlanUsageSummary(record.usage_summary),
    allowed_actions: normalizeFeePlanAllowedActions(record.allowed_actions),
  };
}

export function normalizeFeePlans(raw: unknown): FeePlan[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => normalizeFeePlan(entry)).filter((plan): plan is FeePlan => plan != null);
}

/** True only when API explicitly allows the action — never inferred from state. */
export function feePlanAllowsAction(
  plan: Pick<FeePlan, 'allowed_actions'> | null | undefined,
  action: FeePlanLifecycleAction,
): boolean {
  return plan?.allowed_actions?.[action] === true;
}

export function feePlanIsUsed(usage: FeePlanUsage | undefined): boolean {
  if (!usage) return false;
  if (usage.is_used === true) return true;
  return (
    (usage.assigned_student_count ?? usage.student_count ?? 0) > 0 ||
    (usage.agreement_count ?? 0) > 0 ||
    (usage.student_fee_count ?? 0) > 0 ||
    (usage.installment_count ?? 0) > 0 ||
    (usage.collection_count ?? 0) > 0 ||
    (usage.receipt_count ?? 0) > 0
  );
}

export function feePlanUsageForDisplay(plan: FeePlan): FeePlanUsage | null {
  const usage = plan.usage ?? plan.usage_summary;
  if (!usage) return null;
  return usage;
}

export function resolveFeePlanLifecycleErrorCode(code?: string): FeePlanLifecycleErrorCode | null {
  if (!code) return null;
  return (FEE_PLAN_LIFECYCLE_ERROR_CODES as readonly string[]).includes(code)
    ? (code as FeePlanLifecycleErrorCode)
    : null;
}

export function feePlanLifecycleErrorMessageKey(code: FeePlanLifecycleErrorCode): string {
  return `admin.finance.feePlansWorkspace.lifecycleErrors.${code}`;
}

export function suggestDuplicatePlanName(sourceName: string): string {
  const trimmed = sourceName.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('نسخة من ')) return trimmed;
  return `نسخة من ${trimmed}`;
}

export function suggestDuplicatePlanCode(sourceCode: string): string {
  const trimmed = sourceCode.trim();
  if (!trimmed) return '';
  const suffix = '-copy';
  if (trimmed.endsWith(suffix)) return trimmed;
  return `${trimmed}${suffix}`;
}
