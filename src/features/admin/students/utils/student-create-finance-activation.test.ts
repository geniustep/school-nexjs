import { describe, expect, it } from 'vitest';
import type { FeePlanSuggestResult, StudentCreateFinanceFormState } from '@/types/student-enrollment-finance';
import { defaultStudentCreateFinanceFormState } from './student-enrollment-finance';
import { defaultStudentProfileFormState } from './student-profile';
import { buildStudentCreatePayload } from './student-profile';
import {
  applyFinanceActivationMode,
  canOfferFinanceAgreementActivation,
  resolveStudentCreateAgreementState,
} from './student-create-finance-activation';
import { buildStudentCreateFinancePayload } from './enrollment-finance-payload';

const suggest: FeePlanSuggestResult = {
  ok: true,
  fee_plan_id: 2967,
  fee_plan_name: 'Plan',
  suggested_periods: [{ period_key: '2026-09', label: 'Sep', due_date: '2026-09-05', selected: true }],
  excluded_periods: [],
};

const profile = {
  ...defaultStudentProfileFormState(null),
  firstName: 'QA',
  lastName: 'Activate',
  massarCode: 'QA12345678',
  academicYearId: '1',
  levelId: '2446',
  classId: '2058',
  actualJoinDate: '2026-09-05',
};

describe('applyFinanceActivationMode', () => {
  it('adds activation_mode only for activate', () => {
    const base = { fee_plan_id: 2967, customize_plan: false };
    expect(applyFinanceActivationMode(base, 'draft')).toEqual(base);
    expect(applyFinanceActivationMode(base, 'activate')).toEqual({
      ...base,
      activation_mode: 'activate',
    });
  });
});

describe('buildStudentCreateFinancePayload activation_mode', () => {
  it('omits activation_mode for draft saves', () => {
    const payload = buildStudentCreateFinancePayload(2967, suggest.suggested_periods, {
      ...defaultStudentCreateFinanceFormState(suggest),
    });
    expect(payload.activation_mode).toBeUndefined();
  });

  it('sends activation_mode activate when requested', () => {
    const financeState: StudentCreateFinanceFormState = {
      ...defaultStudentCreateFinanceFormState(suggest),
      customizePlan: true,
      customizationReason: 'scholarship',
      lineDiscounts: {
        '3670': { enabled: true, type: 'percent', value: '40', reason: 'scholarship' },
      },
    };
    const payload = buildStudentCreateFinancePayload(2967, suggest.suggested_periods, financeState, {
      activationMode: 'activate',
    });
    expect(payload.activation_mode).toBe('activate');
    expect(payload.periods?.length).toBeGreaterThan(0);
    expect(payload.discounts?.[0]?.value).toBe(40);
  });
});

describe('buildStudentCreatePayload finance activation', () => {
  it('automatically activates Base Plan finance on normal full-registration save', () => {
    const payload = buildStudentCreatePayload(profile, {
      suggest,
      financeState: defaultStudentCreateFinanceFormState(suggest),
      schoolId: 3,
    });
    expect(payload.finance?.activation_mode).toBe('activate');
    expect(payload.finance?.fee_plan_id).toBeUndefined();
    expect(payload.academic?.class_id).toBe(2058);
  });

  it('sends activation_mode activate for direct activation save', () => {
    const payload = buildStudentCreatePayload(profile, {
      suggest,
      financeState: {
        ...defaultStudentCreateFinanceFormState(suggest),
        customizePlan: true,
        customizationReason: 'scholarship',
        lineDiscounts: {
          '3670': { enabled: true, type: 'percent', value: '40', reason: 'scholarship' },
        },
      },
      schoolId: 3,
      activationMode: 'activate',
    });
    expect(payload.finance?.activation_mode).toBe('activate');
    expect(payload.finance?.discounts?.[0]?.value).toBe(40);
    expect(payload.academic?.class_id).toBe(2058);
  });
});

describe('canOfferFinanceAgreementActivation', () => {
  it('is false without finance plan', () => {
    expect(
      canOfferFinanceAgreementActivation({
        suggest: null,
        financeBlocked: false,
        state: profile,
        schoolId: 3,
        financeState: defaultStudentCreateFinanceFormState(null),
        previewLoading: false,
        previewError: null,
        preview: null,
      }),
    ).toBe(false);
  });

  it('is true when finance prerequisites and validation pass', () => {
    expect(
      canOfferFinanceAgreementActivation({
        suggest,
        financeBlocked: false,
        state: profile,
        schoolId: 3,
        financeState: defaultStudentCreateFinanceFormState(suggest),
        previewLoading: false,
        previewError: null,
        preview: { final_total: 18500 },
      }),
    ).toBe(true);
  });

  it('is false when class is missing', () => {
    expect(
      canOfferFinanceAgreementActivation({
        suggest,
        financeBlocked: false,
        state: { ...profile, classId: '' },
        schoolId: 3,
        financeState: defaultStudentCreateFinanceFormState(suggest),
        previewLoading: false,
        previewError: null,
        preview: { final_total: 18500 },
      }),
    ).toBe(false);
  });
});

describe('resolveStudentCreateAgreementState', () => {
  it('reads agreement_state from response root or finance block', () => {
    expect(resolveStudentCreateAgreementState({ id: 1, agreement_state: 'active' })).toBe('active');
    expect(
      resolveStudentCreateAgreementState({ id: 1, finance: { agreement_state: 'draft' } }),
    ).toBe('draft');
  });
});
