import { describe, expect, it } from 'vitest';
import type { FeePlanSuggestResult } from '@/types/student-enrollment-finance';
import { defaultStudentCreateFinanceFormState } from './student-enrollment-finance';
import { buildStudentCreatePayload, defaultStudentProfileFormState } from './student-profile';
import {
  isOptionalFinanceGateStatus,
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

describe('resolveStudentCreateFinanceStepGate — required Base Plan', () => {
  it('passes and attaches finance when the canonical plan is available', () => {
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

  it('ignores the legacy skip flag when a canonical plan is available', () => {
    const gate = resolveStudentCreateFinanceStepGate({
      skipFinance: true,
      levelSelected: true,
      suggestLoading: false,
      financeBlocked: false,
      suggest,
      prerequisiteReason: 'ok',
    });
    expect(gate.status).toBe('ok');
    expect(gate.attachFinance).toBe(true);
  });

  it('blocks the step when a canonical prerequisite is missing', () => {
    const gate = resolveStudentCreateFinanceStepGate({
      skipFinance: false,
      levelSelected: true,
      suggestLoading: false,
      financeBlocked: false,
      suggest,
      prerequisiteReason: 'join_date',
    });
    expect(gate.status).toBe('prerequisite');
    expect(gate.prerequisiteReason).toBe('join_date');
    expect(gate.attachFinance).toBe(false);
  });
});

describe('resolveStudentCreateFinanceStepGate — missing Base Plan', () => {
  it('does not make missing plans optional even when legacy skip is true', () => {
    const gate = resolveStudentCreateFinanceStepGate({
      skipFinance: true,
      levelSelected: true,
      suggestLoading: false,
      financeBlocked: false,
      suggest: null,
      prerequisiteReason: 'ok',
    });
    expect(gate.status).toBe('no_plan');
    expect(gate.attachFinance).toBe(false);
    expect(isOptionalFinanceGateStatus(gate.status)).toBe(false);
  });

  it('keeps a finance-blocked state non-optional', () => {
    const gate = resolveStudentCreateFinanceStepGate({
      skipFinance: false,
      levelSelected: true,
      suggestLoading: false,
      financeBlocked: true,
      suggest: null,
      prerequisiteReason: 'ok',
    });
    expect(gate.status).toBe('blocked');
    expect(gate.attachFinance).toBe(false);
    expect(isOptionalFinanceGateStatus(gate.status)).toBe(false);
  });
});

describe('shouldAttachFinanceOnCreate', () => {
  it('attaches finance for the standard plan path', () => {
    expect(shouldAttachFinanceOnCreate(false, suggest, admissionProfile, 3)).toBe(true);
  });

  it('attaches finance even when class is not selected', () => {
    expect(
      shouldAttachFinanceOnCreate(false, suggest, { ...admissionProfile, classId: '' }, 3),
    ).toBe(true);
  });

  it('legacy skip cannot suppress finance when the plan exists', () => {
    expect(shouldAttachFinanceOnCreate(true, suggest, admissionProfile, 3)).toBe(true);
  });

  it('does not invent finance when no plan is suggested', () => {
    expect(shouldAttachFinanceOnCreate(false, null, admissionProfile, 3)).toBe(false);
  });
});

describe('buildStudentCreatePayload — automatic Base Plan payload', () => {
  it('does not attach finance when no suggestion is supplied to the builder', () => {
    const payload = buildStudentCreatePayload(admissionProfile, {
      suggest: null,
      financeState: defaultStudentCreateFinanceFormState(suggest),
      schoolId: 3,
    });
    expect(payload.first_name).toBe('QA');
    expect(payload.last_name).toBe('Admission');
    expect(payload.class_id).toBe(2058);
    expect(payload.finance).toBeUndefined();
    expect(payload.academic).toBeUndefined();
  });

  it('sends automatic activation without pinning fee_plan_id', () => {
    const payload = buildStudentCreatePayload(admissionProfile, {
      suggest,
      financeState: defaultStudentCreateFinanceFormState(suggest),
      schoolId: 3,
    });
    expect(payload.finance).toEqual({
      customize_plan: false,
      activation_mode: 'activate',
    });
    expect(payload.academic?.class_id).toBe(2058);
  });

  it('sends Base Plan finance without academic.class_id when class is omitted', () => {
    const payload = buildStudentCreatePayload(
      { ...admissionProfile, classId: '' },
      {
        suggest,
        financeState: defaultStudentCreateFinanceFormState(suggest),
        schoolId: 3,
      },
    );
    expect(payload.finance).toEqual({
      customize_plan: false,
      activation_mode: 'activate',
    });
    expect(payload.academic).toMatchObject({
      school_id: 3,
      academic_year_id: 1,
      level_id: 2446,
      enrollment_date: '2026-09-05',
    });
    expect(payload.academic).not.toHaveProperty('class_id');
  });
});
