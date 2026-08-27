import type { FeeType } from '@/types/finance';
import { inferDefaultPricingMode } from './fee-plan-pricing';
import { newDraftLine, type DraftFeePlanLine } from './fee-plan-types';

export interface FeeSetupCoreTypes {
  registration: FeeType | null;
  monthlyTuition: FeeType | null;
}

function normalized(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function isOneTime(value: unknown): boolean {
  const v = normalized(value);
  return v === 'once' || v === 'one_time';
}

function isMonthly(value: unknown): boolean {
  return normalized(value) === 'monthly';
}

function searchText(type: FeeType): string {
  return `${type.code ?? ''} ${type.name ?? ''}`.toLowerCase();
}

function preferType(candidates: FeeType[], tokens: string[]): FeeType | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const mandatory = candidates.filter((type) => type.is_mandatory === true);
  const pool = mandatory.length === 1 ? mandatory : candidates;
  if (pool.length === 1) return pool[0];

  const scored = pool
    .map((type) => ({
      type,
      score: tokens.reduce((sum, token) => sum + (searchText(type).includes(token) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0 && scored[0].score > (scored[1]?.score ?? -1)) {
    return scored[0].type;
  }
  return null;
}

/**
 * Resolve only the two core school-fee inputs used by the simplified matrix.
 * Ambiguous catalogs deliberately return null instead of guessing financial semantics.
 */
export function resolveFeeSetupCoreTypes(feeTypes: FeeType[]): FeeSetupCoreTypes {
  const active = feeTypes.filter((type) => type.active !== false);
  const tuition = active.filter((type) => normalized(type.category) === 'tuition');

  const registration = preferType(
    tuition.filter((type) => isOneTime(type.frequency)),
    ['reg', 'registration', 'inscription', 'تسجيل'],
  );
  const monthlyTuition = preferType(
    tuition.filter((type) => isMonthly(type.frequency)),
    ['tuition', 'school', 'scolar', 'mensual', 'تمدرس', 'واجب'],
  );

  return { registration, monthlyTuition };
}

export function effectiveLineLevelIds(
  line: DraftFeePlanLine,
  planLevelIds: number[],
): number[] {
  if (line.levelScopeMode === 'all_plan_levels') return [...planLevelIds];
  const allowed = new Set(planLevelIds);
  return line.levelIds.filter((id) => allowed.has(id));
}

export function findFeeLineForLevel(
  lines: DraftFeePlanLine[],
  feeTypeId: number,
  levelId: number,
  planLevelIds: number[],
): DraftFeePlanLine | null {
  return (
    lines.find(
      (line) =>
        line.feeTypeId === feeTypeId &&
        effectiveLineLevelIds(line, planLevelIds).includes(levelId),
    ) ?? null
  );
}

export function feeAmountForLevel(
  lines: DraftFeePlanLine[],
  feeTypeId: number,
  levelId: number,
  planLevelIds: number[],
): number | null {
  return findFeeLineForLevel(lines, feeTypeId, levelId, planLevelIds)?.amount ?? null;
}

export function feeInstallmentCountForLevel(
  lines: DraftFeePlanLine[],
  feeTypeId: number,
  levelId: number,
  planLevelIds: number[],
): number | null {
  return findFeeLineForLevel(lines, feeTypeId, levelId, planLevelIds)?.installmentCount ?? null;
}

function lineDefaultsForType(
  feeType: FeeType,
  line: DraftFeePlanLine,
  installmentCount: number,
): DraftFeePlanLine {
  const frequency = isOneTime(feeType.frequency) ? 'once' : normalized(feeType.frequency) || line.frequency;
  const count = isOneTime(feeType.frequency) ? 1 : Math.max(1, installmentCount);
  const countChanged = line.installmentCount !== count;
  const explicitScheduleStillFits =
    line.scheduleMode === 'explicit' && line.installmentSchedule.length === count;
  return {
    ...line,
    feeTypeId: feeType.id,
    label: line.label.trim() || feeType.name,
    frequency,
    pricingMode: inferDefaultPricingMode(frequency),
    isOptional: false,
    installmentCount: count,
    scheduleMode:
      countChanged && !explicitScheduleStillFits ? 'on_assignment' : line.scheduleMode,
    installmentSchedule:
      countChanged && !explicitScheduleStillFits ? [] : line.installmentSchedule,
  };
}

export function setFeeForLevel(input: {
  lines: DraftFeePlanLine[];
  feeType: FeeType;
  planLevelIds: number[];
  levelId: number;
  amount: number;
  installmentCount: number;
  clientId: string;
}): DraftFeePlanLine[] {
  const { lines, feeType, planLevelIds, levelId, amount, installmentCount, clientId } = input;
  const target = findFeeLineForLevel(lines, feeType.id, levelId, planLevelIds);

  if (!(amount > 0)) {
    if (!target) return lines;
    const levels = effectiveLineLevelIds(target, planLevelIds);
    if (levels.length <= 1) return lines.filter((line) => line !== target);
    const remaining = levels.filter((id) => id !== levelId);
    return lines.map<DraftFeePlanLine>((line) =>
      line === target
        ? { ...line, levelScopeMode: 'specific', levelIds: remaining }
        : line,
    );
  }

  if (!target) {
    const created = lineDefaultsForType(
      feeType,
      {
        ...newDraftLine(clientId),
        amount,
        levelScopeMode: 'specific',
        levelIds: [levelId],
      },
      installmentCount,
    );
    return [...lines, created];
  }

  const targetLevels = effectiveLineLevelIds(target, planLevelIds);
  const updatedTarget = lineDefaultsForType(
    feeType,
    { ...target, amount },
    installmentCount,
  );

  if (targetLevels.length <= 1) {
    return lines.map<DraftFeePlanLine>((line) =>
      line === target
        ? { ...updatedTarget, levelScopeMode: 'specific', levelIds: [levelId] }
        : line,
    );
  }

  const remaining = targetLevels.filter((id) => id !== levelId);
  const split = lineDefaultsForType(
    feeType,
    {
      ...target,
      lineId: undefined,
      clientId,
      amount,
      levelScopeMode: 'specific',
      levelIds: [levelId],
    },
    installmentCount,
  );

  return [
    ...lines.map<DraftFeePlanLine>((line) =>
      line === target
        ? { ...target, levelScopeMode: 'specific', levelIds: remaining }
        : line,
    ),
    split,
  ];
}

export function applyFeeToAllPlanLevels(input: {
  lines: DraftFeePlanLine[];
  feeType: FeeType;
  planLevelIds: number[];
  amount: number;
  installmentCount: number;
  clientId: string;
}): DraftFeePlanLine[] {
  const { lines, feeType, planLevelIds, amount, installmentCount, clientId } = input;
  const existing = lines.filter((line) => line.feeTypeId === feeType.id);
  const others = lines.filter((line) => line.feeTypeId !== feeType.id);
  if (!(amount > 0) || planLevelIds.length === 0) return others;

  const base = existing[0] ?? newDraftLine(clientId);
  const consolidated = lineDefaultsForType(
    feeType,
    {
      ...base,
      clientId: base.clientId || clientId,
      amount,
      levelScopeMode: 'all_plan_levels',
      levelIds: [],
    },
    installmentCount,
  );
  return [...others, consolidated];
}