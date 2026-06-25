import { describe, expect, it } from 'vitest';
import type { FeePlanSuggestResult } from '@/types/student-enrollment-finance';
import { defaultStudentCreateFinanceFormState } from './student-enrollment-finance';
import { buildStudentCreatePayload, defaultStudentProfileFormState } from './student-profile';
import {
  resolveStudentCreateFinanceStepGate,
  shouldAttachFinanceOnCreate,
} from './student-create-finance-skip';

const suggest: FeePlanSuggestResult = {
  ok: true,
  fee_plan_id: 2967,
  fee_plan_name: 'Plan',
  suggested_periods: [
    { period_key: '2026-09', label: 'Sep', due_date: '2026-09-05', selected: true },
  ],
  excluded_periods: [],
};

// Student coming from an admission: identity + academic enrollment are complete.
const admissionProfile = {
  ...defaultStudentProfileFormState(null),
  firstName: 'QA',
  lastName: 'Admission',
  academicYearId: '1',
  cycleId: '5',
  levelId: '2446',
  classId: '2058',
  actualJoinDate: '2026-09-05',
};

describe('resolveStudentCreateFinanceStepGate — admission_id with finance plan', () => {
  it('passes the step and attaches finance when a plan is available and selected', () => {
    const gate = resolveStudentCreateFinanceStepGate({
      skipFinance: false,
      levelSelected: true,
      suggestLoading: false,
      financeBlocked: false,
      suggest,
      prerequisiteReason: 'ok',
    });
    expect(gate.status).toBe('ok');
    expect(gate.attachFinance).toBe(true);
  });

  it('blocks the step when class is still missing (current behaviour preserved)', () => {
    const gate = resolveStudentCreateFinanceStepGate({
      skipFinance: false,
      levelSelected: true,
      suggestLoading: false,
      financeBlocked: false,
      suggest,
      prerequisiteReason: 'class',
    });
    expect(gate.status).toBe('prerequisite');
    expect(gate.prerequisiteReason).toBe('class');
    expect(gate.attachFinance).toBe(false);
  });
});

describe('resolveStudentCreateFinanceStepGate — admission_id without finance plan', () => {
  it('lets the user skip even when no default plan exists (not stuck on the step)', () => {
    const gate = resolveStudentCreateFinanceStepGate({
      skipFinance: true,
      levelSelected: true,
      suggestLoading: false,
      financeBlocked: true,
      suggest: null,
      prerequisiteReason: 'ok',
    });
    expect(gate.status).toBe('skip');
    expect(gate.attachFinance).toBe(false);
  });

  it('without skip, a missing plan still blocks progress (no silent create)', () => {
    const gate = resolveStudentCreateFinanceStepGate({
      skipFinance: false,
      levelSelected: true,
      suggestLoading: false,
      financeBlocked: false,
      suggest: null,
      prerequisiteReason: 'ok',
    });
    expect(gate.status).toBe('no_plan');
  });
});

describe('shouldAttachFinanceOnCreate', () => {
  it('attaches finance for the standard plan path', () => {
    expect(shouldAttachFinanceOnCreate(false, suggest, admissionProfile, 3)).toBe(true);
  });

  it('omits finance when the user skips the plan', () => {
    expect(shouldAttachFinanceOnCreate(true, suggest, admissionProfile, 3)).toBe(false);
  });

  it('omits finance when no plan is suggested', () => {
    expect(shouldAttachFinanceOnCreate(false, null, admissionProfile, 3)).toBe(false);
  });
});

describe('buildStudentCreatePayload — finance optional on skip', () => {
  it('creates student + academic enrollment without a finance/agreement payload when skipped', () => {
    const payload = buildStudentCreatePayload(admissionProfile, {
      suggest: null, // wizard passes null suggest when skipping
      financeState: defaultStudentCreateFinanceFormState(suggest),
      schoolId: 3,
    });
    expect(payload.first_name).toBe('QA');
    expect(payload.last_name).toBe('Admission');
    expect(payload.class_id).toBe(2058);
    expect(payload.finance).toBeUndefined();
    expect(payload.academic).toBeUndefined();
  });

  it('keeps sending finance + academic when a plan is selected', () => {
    const payload = buildStudentCreatePayload(admissionProfile, {
      suggest,
      financeState: defaultStudentCreateFinanceFormState(suggest),
      schoolId: 3,
    });
    expect(payload.finance?.fee_plan_id).toBe(2967);
    expect(payload.academic?.class_id).toBe(2058);
  });
});
