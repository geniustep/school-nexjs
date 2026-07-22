import { describe, expect, it, vi } from 'vitest';
import {
  applySharedFinanceSettings,
  buildFamilyFinanceDraftsFromRegistration,
  familyFinanceOutcomeSummary,
  includedFinanceDraftsReady,
  reopenFamilyFinanceSetup,
  resolveFamilyFinanceDraftsForSetup,
  shouldOfferFamilyFinanceFailedRetry,
  type FamilyChildFinanceDraft,
} from './family-registration-finance-state';
import {
  buildAssignBodyFromFinanceDraft,
  readAssignAgreementId,
  runFamilyFinancePlansSubmit,
} from './family-registration-finance-submit';
import { validateFamilyFinanceDrafts } from './family-registration-finance-validate';
import type { AssignPlanPreview } from '@/types/student-finance-assign-plan';
import type {
  FeePlanSuggestResult,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';
import type { ApiResponse } from '@/types/api';

const t = (key: string) => key;

function okResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data, meta: {} };
}

function errResponse(code: string, message: string): ApiResponse<unknown> {
  return { success: false, error: { code, message }, meta: {} };
}

function suggestSnapshot(
  overrides?: Partial<FeePlanSuggestResult>,
): FeePlanSuggestResult {
  return {
    ok: true,
    fee_plan_id: 10,
    fee_plan_name: 'خطة أساسية',
    suggested_periods: [
      {
        period_key: '2025-09',
        selected: true,
        due_date: '2025-09-01',
        label: 'سبتمبر',
      },
    ],
    excluded_periods: [],
    total_due: 12000,
    currency: { name: 'MAD', symbol: 'د.م.' },
    eligible_plans: [{ id: 10, name: 'خطة أساسية' }],
    ...overrides,
  };
}

function readyPreview(overrides?: Partial<AssignPlanPreview>): {
  kind: 'ready';
  plan: AssignPlanPreview;
} {
  return {
    kind: 'ready',
    plan: {
      feePlanId: 10,
      planName: 'خطة أساسية',
      academicYearId: 9,
      academicYearName: '2025/2026',
      levelName: 'الأولى',
      total: 12000,
      currency: { name: 'MAD', symbol: 'د.م.' },
      installmentCount: 10,
      allowedActions: ['assign_plan'],
      canAssign: true,
      suggestSnapshot: suggestSnapshot(),
      ...overrides,
    },
  };
}

function baseFinanceState(
  patch?: Partial<StudentCreateFinanceFormState>,
): StudentCreateFinanceFormState {
  return {
    selectedFeePlanId: 10,
    customizePlan: false,
    customizationReason: '',
    customizationNotes: '',
    periodOverrides: {},
    planDiscount: { enabled: false, type: '', value: '', reason: '' },
    lineDiscounts: {},
    oneTimeLines: {},
    ...patch,
  };
}

function draft(
  overrides?: Partial<FamilyChildFinanceDraft>,
): FamilyChildFinanceDraft {
  return {
    localId: 'c1',
    studentId: 101,
    displayName: 'يوسف',
    academicYearId: 9,
    levelId: '3',
    included: true,
    billingResponsibleLabel: 'أحمد',
    previewLoading: false,
    preview: readyPreview(),
    financeState: baseFinanceState(),
    hasLocalCustomization: false,
    ...overrides,
  };
}

describe('family registration finance drafts', () => {
  it('builds drafts only from successfully registered students', () => {
    const drafts = buildFamilyFinanceDraftsFromRegistration({
      results: [
        {
          localId: 'a',
          displayName: 'يوسف',
          status: 'succeeded',
          studentId: 11,
          canRetrySafely: false,
        },
        {
          localId: 'b',
          displayName: 'فاشل',
          status: 'failed',
          canRetrySafely: true,
        },
        {
          localId: 'c',
          displayName: 'غامض',
          status: 'ambiguous',
          canRetrySafely: false,
        },
      ],
      childrenByLocalId: new Map([
        ['a', { academicYearId: '9', levelId: '3' }],
        ['b', { academicYearId: '9', levelId: '4' }],
      ]),
      billingResponsibleLabel: 'أحمد',
    });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].studentId).toBe(11);
    expect(drafts[0].billingResponsibleLabel).toBe('أحمد');
  });

  it('does not mix student ids when applying shared discount settings', () => {
    const source = draft({
      localId: 'c1',
      studentId: 101,
      financeState: baseFinanceState({
        customizePlan: true,
        customizationReason: 'scholarship',
        planDiscount: { enabled: true, type: 'percent', value: '10', reason: '' },
        selectedFeePlanId: 10,
      }),
      hasLocalCustomization: true,
    });
    const target = draft({
      localId: 'c2',
      studentId: 202,
      levelId: '4',
      preview: readyPreview({
        feePlanId: 22,
        planName: 'خطة أخرى',
        suggestSnapshot: suggestSnapshot({
          fee_plan_id: 22,
          fee_plan_name: 'خطة أخرى',
          suggested_periods: [],
          eligible_plans: [{ id: 22, name: 'خطة أخرى' }],
        }),
      }),
      financeState: baseFinanceState({ selectedFeePlanId: 22 }),
    });

    const outcome = applySharedFinanceSettings({
      drafts: [source, target],
      sourceLocalId: 'c1',
      targetLocalIds: ['c1', 'c2'],
    });

    expect(outcome.appliedLocalIds).toEqual(['c2']);
    const nextTarget = outcome.drafts.find((d) => d.localId === 'c2')!;
    expect(nextTarget.studentId).toBe(202);
    expect(nextTarget.financeState?.selectedFeePlanId).toBe(22);
    expect(nextTarget.financeState?.planDiscount).toEqual({
      enabled: true,
      type: 'percent',
      value: '10',
      reason: '',
    });
    expect(nextTarget.financeState?.customizationReason).toBe('scholarship');
  });

  it('skips shared apply for excluded and already-active children', () => {
    const source = draft({ localId: 'c1' });
    const excluded = draft({ localId: 'c2', studentId: 2, included: false });
    const active = draft({
      localId: 'c3',
      studentId: 3,
      preview: { kind: 'active_agreement_exists' },
      financeState: null,
    });
    const outcome = applySharedFinanceSettings({
      drafts: [source, excluded, active],
      sourceLocalId: 'c1',
      targetLocalIds: ['c2', 'c3'],
    });
    expect(outcome.appliedLocalIds).toEqual([]);
    expect(outcome.skipped.map((s) => s.reason)).toEqual(['excluded', 'already_active']);
  });
});

describe('family finance validation and payloads', () => {
  it('requires ready included children before confirm', () => {
    const result = validateFamilyFinanceDrafts(
      [
        draft({
          preview: { kind: 'no_eligible_plan' },
          financeState: null,
        }),
      ],
      t,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.byLocalId.c1.feePlan).toBeTruthy();
    }
  });

  it('builds independent assign-plan bodies per child without mixing ids', () => {
    const first = draft({ studentId: 101, localId: 'c1' });
    const second = draft({
      localId: 'c2',
      studentId: 202,
      financeState: baseFinanceState({
        selectedFeePlanId: 22,
        customizePlan: true,
        customizationReason: 'scholarship',
        planDiscount: { enabled: true, type: 'percent', value: '5', reason: '' },
      }),
      preview: readyPreview({
        feePlanId: 22,
        suggestSnapshot: suggestSnapshot({
          fee_plan_id: 22,
          fee_plan_name: 'خطة 22',
          suggested_periods: [
            {
              period_key: '2025-09',
              selected: true,
              due_date: '2025-09-01',
              label: 'سبتمبر',
            },
          ],
        }),
      }),
    });

    const body1 = buildAssignBodyFromFinanceDraft(first);
    const body2 = buildAssignBodyFromFinanceDraft(second);
    expect(body1?.fee_plan_id).toBe(10);
    expect(body2?.fee_plan_id).toBe(22);
    expect(body1?.activation_mode).toBe('draft');
    expect(body2?.discounts?.[0]).toEqual(
      expect.objectContaining({ scope: 'plan', type: 'percent', value: 5 }),
    );
    expect(body1).not.toHaveProperty('student_id');
    expect(body2).not.toHaveProperty('student_id');
  });
});

describe('family finance sequential submit', () => {
  it('assigns independent plans and preserves partial success', async () => {
    const drafts = [
      draft({ localId: 'c1', studentId: 101 }),
      draft({ localId: 'c2', studentId: 202 }),
    ];
    const assignPlan = vi.fn(async (studentId: number) => {
      if (studentId === 202) {
        return errResponse('validation_error', 'bad');
      }
      return okResponse({ agreement_id: 55 });
    });

    const result = await runFamilyFinancePlansSubmit({
      drafts,
      assignPlan,
      mapErrorMessage: (error) => error?.message ?? 'err',
    });

    expect(result.results[0]).toEqual(
      expect.objectContaining({
        studentId: 101,
        status: 'succeeded',
        agreementId: 55,
      }),
    );
    expect(result.results[1]).toEqual(
      expect.objectContaining({
        studentId: 202,
        status: 'failed',
        canRetrySafely: true,
      }),
    );
    expect(familyFinanceOutcomeSummary(result.results).kind).toBe('partial_success');
    expect(shouldOfferFamilyFinanceFailedRetry(result.results)).toBe(true);
    expect(result.lockedAgainstFullResubmit).toBe(true);
  });

  it('marks already_active without retry and skips excluded children', async () => {
    const drafts = [
      draft({
        localId: 'c1',
        studentId: 101,
        preview: { kind: 'active_agreement_exists' },
        financeState: null,
      }),
      draft({ localId: 'c2', studentId: 202, included: false }),
    ];
    const assignPlan = vi.fn();
    const result = await runFamilyFinancePlansSubmit({
      drafts,
      assignPlan,
      mapErrorMessage: () => 'x',
    });
    expect(assignPlan).not.toHaveBeenCalled();
    expect(result.results[0].status).toBe('already_active');
    expect(result.results[1].status).toBe('skipped');
  });

  it('treats network throw as ambiguous and blocks remaining without safe retry', async () => {
    const drafts = [
      draft({ localId: 'c1', studentId: 101 }),
      draft({ localId: 'c2', studentId: 202 }),
    ];
    const assignPlan = vi.fn(async () => {
      throw new Error('offline');
    });
    const result = await runFamilyFinancePlansSubmit({
      drafts,
      assignPlan,
      mapErrorMessage: () => 'x',
    });
    expect(result.results[0].status).toBe('ambiguous');
    expect(result.results[0].canRetrySafely).toBe(false);
    expect(result.results[1].status).toBe('blocked');
    expect(shouldOfferFamilyFinanceFailedRetry(result.results)).toBe(false);
  });

  it('detects fee_plan_already_assigned as already_active conflict', async () => {
    const result = await runFamilyFinancePlansSubmit({
      drafts: [draft()],
      assignPlan: async () => errResponse('fee_plan_already_assigned', 'already'),
      mapErrorMessage: (e) => e?.message ?? '',
    });
    expect(result.results[0].status).toBe('already_active');
  });

  it('does not re-submit succeeded children on failed-only retry', async () => {
    const drafts = [
      draft({ localId: 'c1', studentId: 101 }),
      draft({ localId: 'c2', studentId: 202 }),
    ];
    const assignPlan = vi.fn(async (studentId: number) =>
      okResponse({ agreement_id: studentId + 1000 }),
    );
    const result = await runFamilyFinancePlansSubmit({
      drafts,
      onlyLocalIds: ['c2'],
      priorResults: [
        {
          localId: 'c1',
          studentId: 101,
          displayName: 'يوسف',
          status: 'succeeded',
          agreementId: 55,
          canRetrySafely: false,
        },
        {
          localId: 'c2',
          studentId: 202,
          displayName: 'مريم',
          status: 'failed',
          canRetrySafely: true,
        },
      ],
      assignPlan,
      mapErrorMessage: () => 'x',
    });
    expect(assignPlan).toHaveBeenCalledTimes(1);
    expect(assignPlan.mock.calls[0][0]).toBe(202);
    expect(result.results[0].status).toBe('succeeded');
    expect(result.results[0].agreementId).toBe(55);
    expect(result.results[1].status).toBe('succeeded');
  });
});

describe('family finance helpers', () => {
  it('reads agreement id from assign response shapes', () => {
    expect(readAssignAgreementId({ agreement_id: 7 })).toBe(7);
    expect(readAssignAgreementId({ agreement: { id: 8 } })).toBe(8);
  });

  it('classifies ready vs not-ready included drafts', () => {
    const { ready, notReady } = includedFinanceDraftsReady([
      draft({ localId: 'ok' }),
      draft({
        localId: 'bad',
        preview: { kind: 'error', message: 'x' },
        financeState: null,
      }),
      draft({ localId: 'skip', included: false }),
    ]);
    expect(ready.map((d) => d.localId)).toEqual(['ok']);
    expect(notReady.map((d) => d.localId)).toEqual(['bad']);
  });
});

describe('family finance hardening helpers', () => {
  it('reopens setup without clearing prior results or lock', () => {
    const reopened = reopenFamilyFinanceSetup({
      phase: 'completed',
      lockedAgainstFullResubmit: true,
      results: [
        {
          localId: 'c1',
          studentId: 101,
          displayName: 'يوسف',
          status: 'succeeded',
          agreementId: 9,
          canRetrySafely: false,
        },
      ],
    });
    expect(reopened.phase).toBe('idle');
    expect(reopened.lockedAgainstFullResubmit).toBe(true);
    expect(reopened.results[0].status).toBe('succeeded');
  });

  it('preserves customized finance drafts when returning to setup for same cohort', () => {
    const existing = [
      draft({
        localId: 'a',
        studentId: 11,
        hasLocalCustomization: true,
        financeState: baseFinanceState({
          planDiscount: { enabled: true, type: 'percent', value: '15', reason: '' },
          customizePlan: true,
          customizationReason: 'scholarship',
        }),
      }),
    ];
    const resolved = resolveFamilyFinanceDraftsForSetup({
      existingDrafts: existing,
      results: [
        {
          localId: 'a',
          displayName: 'يوسف',
          status: 'succeeded',
          studentId: 11,
          canRetrySafely: false,
        },
      ],
      childrenByLocalId: new Map([['a', { academicYearId: '9', levelId: '3' }]]),
      billingResponsibleLabel: 'أحمد',
    });
    expect(resolved[0].financeState?.planDiscount.value).toBe('15');
    expect(resolved[0].hasLocalCustomization).toBe(true);
    expect(resolved[0].studentId).toBe(11);
  });

  it('rejects negative percent discount before clamp', () => {
    const result = validateFamilyFinanceDrafts(
      [
        draft({
          financeState: baseFinanceState({
            customizePlan: true,
            customizationReason: 'scholarship',
            planDiscount: { enabled: true, type: 'percent', value: '-5', reason: '' },
          }),
        }),
      ],
      t,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.byLocalId.c1.discount).toBeTruthy();
    }
  });
});
