import type {
  FinanceRepairAfterOutcome,
  FinanceRepairBeforeSnapshot,
  NormalizedFinanceRepairPreview,
} from '../types/finance-repair';
import { readFinanceRepairReasons } from './normalize-finance-repair-diagnostics';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

interface FeePlanRef {
  id: number | null;
  name: string;
  feeIds: number[];
}

function readFeePlanRefs(value: unknown): FeePlanRef[] {
  const out: FeePlanRef[] = [];
  for (const item of asArray(value)) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ id: null, name: item.trim(), feeIds: [] });
      continue;
    }
    const rec = asRecord(item);
    if (!rec) continue;
    const name =
      readString(rec.fee_plan_name) ??
      readString(rec.name) ??
      readString(rec.label) ??
      readString(rec.plan_name) ??
      readString(rec.title);
    if (!name) continue;
    const feeIds = asArray(rec.fee_ids)
      .map((id) => readFiniteNumber(id))
      .filter((id): id is number => id != null);
    out.push({
      id: readFiniteNumber(rec.fee_plan_id ?? rec.id),
      name,
      feeIds,
    });
  }
  return out;
}

/** Read plan names as plain strings — never translated, exactly as backend sends. */
function readPlanNames(value: unknown): string[] {
  return [...new Set(readFeePlanRefs(value).map((p) => p.name))];
}

function readIdList(value: unknown): number[] {
  return asArray(value)
    .map((id) => readFiniteNumber(id))
    .filter((id): id is number => id != null);
}

function findPlanByFeeIds(plans: FeePlanRef[], feeIds: number[]): FeePlanRef | null {
  if (feeIds.length === 0) return null;
  const feeSet = new Set(feeIds);
  return (
    plans.find((plan) => plan.feeIds.length > 0 && plan.feeIds.every((id) => feeSet.has(id))) ??
    plans.find((plan) => plan.feeIds.some((id) => feeSet.has(id))) ??
    null
  );
}

function readBefore(value: unknown): FinanceRepairBeforeSnapshot {
  const rec = asRecord(value) ?? {};
  return {
    feeCount: readFiniteNumber(rec.fee_count ?? rec.fees_count ?? rec.fees),
    totalAmount: readFiniteNumber(rec.total_amount ?? rec.total ?? rec.amount),
    installmentCount: readFiniteNumber(
      rec.installment_count ?? rec.installments_count ?? rec.installments,
    ),
    planNames: readPlanNames(rec.plan_names ?? rec.plans ?? rec.fee_plans),
  };
}

function readAfter(
  value: unknown,
  beforePlans: FeePlanRef[],
  affectedRecords: Record<string, unknown> | null,
): FinanceRepairAfterOutcome {
  const rec = asRecord(value) ?? {};
  const keptFeeIds = readIdList(rec.kept_fee_ids);
  const cancelFeeIds = readIdList(
    affectedRecords?.cancel_fee_ids ?? rec.cancel_fee_ids ?? rec.cancelled_fee_ids,
  );

  const keptPlan =
    findPlanByFeeIds(beforePlans, keptFeeIds) ??
    (readString(rec.kept_plan ?? rec.kept_plan_name)
      ? { id: null, name: readString(rec.kept_plan ?? rec.kept_plan_name)!, feeIds: keptFeeIds }
      : null);
  const cancelledPlan =
    findPlanByFeeIds(beforePlans, cancelFeeIds) ??
    (readString(rec.cancelled_plan ?? rec.cancelled_plan_name)
      ? {
          id: null,
          name: readString(rec.cancelled_plan ?? rec.cancelled_plan_name)!,
          feeIds: cancelFeeIds,
        }
      : null);

  const cancelInstallmentIds = readIdList(affectedRecords?.cancel_installment_ids);

  return {
    keptPlanName: keptPlan?.name ?? null,
    cancelledPlanName: cancelledPlan?.name ?? null,
    affectedFeeCount:
      readFiniteNumber(rec.affected_fee_count ?? rec.affected_fees ?? rec.fees_affected) ??
      (cancelFeeIds.length > 0 ? cancelFeeIds.length : null),
    affectedInstallmentCount:
      readFiniteNumber(
        rec.affected_installment_count ?? rec.affected_installments ?? rec.installments_affected,
      ) ?? (cancelInstallmentIds.length > 0 ? cancelInstallmentIds.length : null),
    totalAmount: readFiniteNumber(rec.total_amount ?? rec.total ?? rec.amount),
    planNames: readPlanNames(rec.plan_names ?? rec.plans ?? rec.fee_plans),
  };
}

/**
 * Normalize the repair-action preview payload. Never applies anything — this is
 * a pure read of the "before / after / warnings / blockers" preview contract.
 */
export function normalizeFinanceRepairPreview(raw: unknown): NormalizedFinanceRepairPreview {
  const root = asRecord(raw) ?? {};
  const data = asRecord(root.preview) ?? asRecord(root.data) ?? root;

  const blockingReasons = readFinanceRepairReasons(
    data.blocking_reasons ?? data.blockers ?? root.blocking_reasons,
  );
  const warnings = readFinanceRepairReasons(data.warnings ?? root.warnings);

  const blockedExplicit = readBool(data.blocked) ?? readBool(root.blocked);
  const allowedExplicit = readBool(data.allowed) ?? readBool(root.allowed);
  const allowed =
    allowedExplicit ??
    (blockedExplicit != null ? !blockedExplicit : blockingReasons.length === 0);

  const beforeRaw = data.before ?? data.current ?? data.before_snapshot;
  const beforePlans = readFeePlanRefs(asRecord(beforeRaw)?.fee_plans ?? beforeRaw);
  const affectedRecords = asRecord(data.affected_records ?? root.affected_records);
  const after = readAfter(data.after ?? data.result ?? data.after_outcome, beforePlans, affectedRecords);

  const cancelFeeIds = readIdList(affectedRecords?.cancel_fee_ids);
  const cancelInstallmentIds = readIdList(affectedRecords?.cancel_installment_ids);

  return {
    allowed,
    summary: readString(data.summary) ?? readString(root.summary),
    before: readBefore(beforeRaw),
    after,
    cancelledFeeCount: cancelFeeIds.length > 0 ? cancelFeeIds.length : null,
    cancelledInstallmentCount: cancelInstallmentIds.length > 0 ? cancelInstallmentIds.length : null,
    warnings,
    blockingReasons,
    requiresReason: readBool(data.requires_reason) ?? readBool(root.requires_reason) ?? false,
    requiresConfirmation:
      readBool(data.requires_confirmation) ?? readBool(root.requires_confirmation) ?? false,
    confirmationLabel:
      readString(data.confirmation_label) ?? readString(root.confirmation_label),
    currency: readString(data.currency) ?? readString(root.currency),
    followUpActionCode:
      readString(data.follow_up_action ?? data.follow_up_action_code ?? data.next_action) ??
      readString(root.follow_up_action ?? root.follow_up_action_code),
  };
}
