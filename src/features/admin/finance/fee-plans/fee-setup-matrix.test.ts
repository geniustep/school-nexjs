import { describe, expect, it } from 'vitest';
import type { FeeType } from '@/types/finance';
import { newDraftLine } from './fee-plan-types';
import {
  applyFeeToAllPlanLevels,
  feeAmountForLevel,
  resolveFeeSetupCoreTypes,
  setFeeForLevel,
} from './fee-setup-matrix-utils';

const REG: FeeType = {
  id: 11,
  code: 'REGISTRATION',
  name: 'التسجيل',
  school_id: 1,
  category: 'registration',
  frequency: 'once',
  is_mandatory: true,
};
const TUITION: FeeType = {
  id: 12,
  code: 'TUITION',
  name: 'التمدرس',
  school_id: 1,
  category: 'schooling',
  frequency: 'monthly',
  is_mandatory: true,
};

describe('simplified fee setup matrix', () => {
  it('resolves canonical REGISTRATION and TUITION codes regardless of category', () => {
    expect(resolveFeeSetupCoreTypes([REG, TUITION])).toEqual({
      registration: REG,
      monthlyTuition: TUITION,
    });
  });

  it('validates recurrence even when a canonical code exists', () => {
    const invalidRegistration = { ...REG, frequency: 'monthly' };
    expect(resolveFeeSetupCoreTypes([invalidRegistration, TUITION]).registration).toBeNull();
  });

  it('falls back safely when canonical codes are absent', () => {
    const registration = { ...REG, code: 'INSCRIPTION-2026' };
    const tuition = { ...TUITION, code: 'MONTHLY-SCHOOLING' };
    expect(resolveFeeSetupCoreTypes([registration, tuition])).toEqual({
      registration,
      monthlyTuition: tuition,
    });
  });

  it('does not guess when the monthly catalog fallback is ambiguous', () => {
    const tuition = { ...TUITION, code: 'MONTHLY-A', name: 'واجب شهري' };
    const other = { ...TUITION, id: 13, code: 'MONTHLY-B', name: 'واجب شهري ثان' };
    expect(resolveFeeSetupCoreTypes([REG, tuition, other]).monthlyTuition).toBeNull();
  });

  it('applies one amount to all selected levels using one scoped line', () => {
    const lines = applyFeeToAllPlanLevels({
      lines: [],
      feeType: REG,
      planLevelIds: [101, 102, 103],
      amount: 2500,
      installmentCount: 1,
      clientId: 'reg-all',
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      feeTypeId: 11,
      amount: 2500,
      levelScopeMode: 'all_plan_levels',
      installmentCount: 1,
    });
  });

  it('splits only the edited level and preserves the original line id', () => {
    const shared = newDraftLine('tuition-all');
    shared.lineId = 77;
    shared.feeTypeId = TUITION.id;
    shared.label = TUITION.name;
    shared.amount = 2800;
    shared.frequency = 'monthly';
    shared.pricingMode = 'recurring_unit_price';
    shared.installmentCount = 10;
    shared.levelScopeMode = 'all_plan_levels';

    const lines = setFeeForLevel({
      lines: [shared],
      feeType: TUITION,
      planLevelIds: [101, 102, 103],
      levelId: 101,
      amount: 2500,
      installmentCount: 10,
      clientId: 'tuition-101',
    });

    expect(lines).toHaveLength(2);
    expect(lines.find((line) => line.lineId === 77)).toMatchObject({
      amount: 2800,
      levelScopeMode: 'specific',
      levelIds: [102, 103],
    });
    expect(feeAmountForLevel(lines, TUITION.id, 101, [101, 102, 103])).toBe(2500);
    expect(feeAmountForLevel(lines, TUITION.id, 102, [101, 102, 103])).toBe(2800);
  });

  it('removes one level without deleting the shared fee for the others', () => {
    const shared = newDraftLine('reg-all');
    shared.feeTypeId = REG.id;
    shared.amount = 2500;
    shared.levelScopeMode = 'all_plan_levels';

    const lines = setFeeForLevel({
      lines: [shared],
      feeType: REG,
      planLevelIds: [101, 102],
      levelId: 101,
      amount: 0,
      installmentCount: 1,
      clientId: 'unused',
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ levelScopeMode: 'specific', levelIds: [102] });
  });
});

describe('matrix schedule preservation', () => {
  it('preserves an explicit schedule when only the amount changes and the month count stays the same', () => {
    const line = newDraftLine('explicit');
    line.lineId = 501;
    line.feeTypeId = TUITION.id;
    line.label = TUITION.name;
    line.amount = 2500;
    line.frequency = 'monthly';
    line.pricingMode = 'recurring_unit_price';
    line.installmentCount = 10;
    line.levelScopeMode = 'specific';
    line.levelIds = [101];
    line.scheduleMode = 'explicit';
    line.installmentSchedule = Array.from({ length: 10 }, (_, index) => ({
      sequence: index + 1,
      due_date: '2026-09-01',
      amount: 2500,
    }));

    const lines = setFeeForLevel({
      lines: [line],
      feeType: TUITION,
      planLevelIds: [101],
      levelId: 101,
      amount: 2600,
      installmentCount: 10,
      clientId: 'unused',
    });

    expect(lines[0].scheduleMode).toBe('explicit');
    expect(lines[0].installmentSchedule).toHaveLength(10);
  });

  it('drops a stale explicit schedule only when the month count is intentionally changed', () => {
    const line = newDraftLine('explicit');
    line.feeTypeId = TUITION.id;
    line.amount = 2500;
    line.frequency = 'monthly';
    line.installmentCount = 10;
    line.levelScopeMode = 'specific';
    line.levelIds = [101];
    line.scheduleMode = 'explicit';
    line.installmentSchedule = Array.from({ length: 10 }, (_, index) => ({
      sequence: index + 1,
      due_date: '2026-09-01',
      amount: 2500,
    }));

    const lines = setFeeForLevel({
      lines: [line],
      feeType: TUITION,
      planLevelIds: [101],
      levelId: 101,
      amount: 2600,
      installmentCount: 9,
      clientId: 'unused',
    });

    expect(lines[0].installmentCount).toBe(9);
    expect(lines[0].scheduleMode).toBe('on_assignment');
    expect(lines[0].installmentSchedule).toEqual([]);
  });
});
