import type {
  FinanceFileHealth,
  FinanceRepairAction,
  FinanceRepairAnomaly,
  FinanceRepairCandidatePlan,
  FinanceRepairPlanSelectionMode,
  FinanceRepairReason,
  FinanceRepairSeverity,
  NormalizedFinanceRepairDiagnostics,
} from '../types/finance-repair';
import { resolvePlanSelectionMode } from './repair-action-plan-selection';

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

function normalizeReasonValue(value: unknown): string {
  return readString(value)?.toLowerCase().replace(/[\s-]+/g, '_') ?? '';
}

const HEALTH_BY_VALUE: Record<string, FinanceFileHealth> = {
  healthy: 'healthy',
  ok: 'healthy',
  clean: 'healthy',
  good: 'healthy',
  needs_review: 'needs_review',
  review: 'needs_review',
  warning: 'needs_review',
  attention: 'needs_review',
  blocked: 'blocked',
  block: 'blocked',
  locked: 'blocked',
  critical: 'blocked',
};

export function normalizeFinanceFileHealth(value: unknown): FinanceFileHealth {
  const key = normalizeReasonValue(value);
  return HEALTH_BY_VALUE[key] ?? 'unknown';
}

const SEVERITY_BY_VALUE: Record<string, FinanceRepairSeverity> = {
  info: 'info',
  information: 'info',
  notice: 'info',
  warning: 'warning',
  warn: 'warning',
  medium: 'warning',
  blocking: 'blocking',
  blocker: 'blocking',
  critical: 'blocking',
  high: 'blocking',
  error: 'blocking',
};

function normalizeSeverity(value: unknown): FinanceRepairSeverity {
  return SEVERITY_BY_VALUE[normalizeReasonValue(value)] ?? 'warning';
}

/** Read a list of reasons (warnings/blockers) which may be strings or objects. */
export function readFinanceRepairReasons(value: unknown): FinanceRepairReason[] {
  const out: FinanceRepairReason[] = [];
  for (const item of asArray(value)) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ code: item.trim(), message: null });
      continue;
    }
    const rec = asRecord(item);
    if (!rec) continue;
    const code = readString(rec.code) ?? readString(rec.reason) ?? readString(rec.key);
    const message =
      readString(rec.message) ??
      readString(rec.label) ??
      readString(rec.text) ??
      readString(rec.description);
    if (!code && !message) continue;
    out.push({ code: code ?? message ?? '', message: message ?? null });
  }
  // De-duplicate by code+message.
  return out.filter(
    (r, i, list) => list.findIndex((x) => x.code === r.code && x.message === r.message) === i,
  );
}

function readImpacts(rec: Record<string, unknown>): { impacts: string[]; impactAmount: number | null } {
  const impacts: string[] = [];
  const raw =
    rec.financial_impact ?? rec.impact ?? rec.impacts ?? rec.effects ?? rec.consequences;

  let impactAmount: number | null = null;

  const pushString = (v: unknown) => {
    const s = readString(v);
    if (s) impacts.push(s);
  };

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === 'string') {
        pushString(entry);
        continue;
      }
      const entryRec = asRecord(entry);
      if (entryRec) {
        pushString(entryRec.message ?? entryRec.label ?? entryRec.text ?? entryRec.description);
        impactAmount = impactAmount ?? readFiniteNumber(entryRec.amount ?? entryRec.value);
      }
    }
  } else if (typeof raw === 'string') {
    pushString(raw);
  } else {
    const rawRec = asRecord(raw);
    if (rawRec) {
      pushString(rawRec.message ?? rawRec.label ?? rawRec.text ?? rawRec.description);
      impactAmount = readFiniteNumber(rawRec.amount ?? rawRec.value);
    }
  }

  if (impactAmount == null) {
    impactAmount = readFiniteNumber(rec.financial_impact_amount ?? rec.impact_amount);
  }

  return { impacts: [...new Set(impacts)], impactAmount };
}

function readAnomalies(value: unknown): FinanceRepairAnomaly[] {
  const out: FinanceRepairAnomaly[] = [];
  for (const item of asArray(value)) {
    const rec = asRecord(item);
    if (!rec) continue;
    const code =
      readString(rec.code) ??
      readString(rec.type) ??
      readString(rec.key) ??
      readString(rec.id);
    const title = readString(rec.title) ?? readString(rec.label) ?? readString(rec.name);
    if (!code && !title) continue;
    const { impacts, impactAmount } = readImpacts(rec);
    out.push({
      code: code ?? title ?? '',
      title,
      description:
        readString(rec.description) ?? readString(rec.detail) ?? readString(rec.message),
      severity: normalizeSeverity(rec.severity ?? rec.level ?? rec.kind),
      impacts,
      impactAmount,
    });
  }
  return out;
}

function readCandidatePlans(value: unknown): FinanceRepairCandidatePlan[] {
  const out: FinanceRepairCandidatePlan[] = [];
  for (const item of asArray(value)) {
    const rec = asRecord(item);
    if (!rec) continue;
    const id = readFiniteNumber(rec.fee_plan_id ?? rec.id ?? rec.plan_id);
    if (id == null) continue;
    const name =
      readString(rec.fee_plan_name) ??
      readString(rec.name) ??
      readString(rec.label) ??
      readString(rec.title);
    out.push({
      id,
      name: name ?? String(id),
      feeCount: readFiniteNumber(rec.fees_count ?? rec.fee_count),
      totalAmount: readFiniteNumber(rec.total_amount ?? rec.amount),
      installmentCount: readFiniteNumber(
        rec.installments_count ?? rec.installment_count ?? rec.schedule_count,
      ),
      paidAmount: readFiniteNumber(rec.paid_amount),
      hasPayments: readBool(rec.has_payments) ?? false,
      removable: readBool(rec.removable) ?? true,
    });
  }
  return out;
}

function readActions(value: unknown): FinanceRepairAction[] {
  const out: FinanceRepairAction[] = [];
  for (const item of asArray(value)) {
    const rec = asRecord(item);
    if (!rec) continue;
    const code = readString(rec.code) ?? readString(rec.action_code) ?? readString(rec.action);
    if (!code) continue;
    const blockingReasons = readFinanceRepairReasons(
      rec.blocking_reasons ?? rec.blockers ?? rec.blocked_reasons,
    );
    const canApplyExplicit =
      readBool(rec.can_apply) ?? readBool(rec.allowed) ?? readBool(rec.is_applicable);
    const canApply = (canApplyExplicit ?? true) && blockingReasons.length === 0;
    const candidatePlans = readCandidatePlans(rec.candidate_plans ?? rec.candidate_fee_plans);
    const planSelectionMode: FinanceRepairPlanSelectionMode = resolvePlanSelectionMode(code);
    out.push({
      code,
      label: readString(rec.label) ?? readString(rec.title) ?? readString(rec.name),
      description: readString(rec.description) ?? readString(rec.detail),
      canApply,
      requiresReason: readBool(rec.requires_reason) ?? false,
      requiresConfirmation: readBool(rec.requires_confirmation) ?? false,
      blockingReasons,
      isBlocked: !canApply,
      candidatePlans,
      planSelectionMode,
    });
  }
  return out;
}

/**
 * Normalize the repair-diagnostics payload into a stable, UI-facing shape.
 * Defensive against multiple backend field names and missing/empty payloads.
 */
export function normalizeFinanceRepairDiagnostics(
  raw: unknown,
): NormalizedFinanceRepairDiagnostics {
  const root = asRecord(raw) ?? {};
  const data = asRecord(root.diagnostics) ?? asRecord(root.data) ?? root;

  const anomalies = readAnomalies(
    data.anomalies ?? data.issues ?? data.problems ?? data.detected_issues,
  );
  const actions = readActions(
    data.recommended_actions ??
      data.suggested_actions ??
      data.actions ??
      data.available_actions ??
      data.repair_actions,
  );
  const blockingReasons = readFinanceRepairReasons(
    data.blocking_reasons ?? data.blockers ?? data.file_blocking_reasons,
  );

  const permissions = asRecord(data.permissions);
  const canApplyActions =
    readBool(data.can_apply_actions) ??
    readBool(permissions?.can_apply_actions) ??
    readBool(data.can_apply) ??
    false;

  const explicitHealth = normalizeFinanceFileHealth(
    data.overall_status ??
      data.file_status ??
      data.status ??
      data.health ??
      data.state,
  );
  // Derive a sensible health when the backend doesn't send one.
  const derivedHealth: FinanceFileHealth =
    explicitHealth !== 'unknown'
      ? explicitHealth
      : blockingReasons.length > 0 || anomalies.some((a) => a.severity === 'blocking')
        ? 'blocked'
        : anomalies.length > 0
          ? 'needs_review'
          : 'healthy';

  const available =
    asRecord(root.diagnostics) != null ||
    asRecord(root.data) != null ||
    anomalies.length > 0 ||
    actions.length > 0 ||
    blockingReasons.length > 0 ||
    explicitHealth !== 'unknown' ||
    readBool(data.can_apply_actions) != null;

  return {
    available,
    health: derivedHealth,
    canApplyActions,
    anomalies,
    actions,
    blockingReasons,
    hasAnomalies: anomalies.length > 0,
  };
}
