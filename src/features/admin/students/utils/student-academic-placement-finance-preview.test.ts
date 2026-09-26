import { describe, expect, it } from 'vitest';
import {
  normalizeAcademicPlacementFinancePreview,
  shouldOfferAcademicPlacementCarryForward,
} from './student-academic-placement-finance-preview';

describe('academic placement finance carry-forward', () => {
  it('offers carry-forward only for the sole plan-coverage finance blocker', () => {
    expect(
      shouldOfferAcademicPlacementCarryForward('finance_review_required', {
        finance_review_reasons: ['target_level_not_covered_by_fee_plan'],
      }),
    ).toBe(true);
    expect(
      shouldOfferAcademicPlacementCarryForward('finance_review_required', {
        finance_review_reasons: [
          'target_level_not_covered_by_fee_plan',
          'another_finance_blocker',
        ],
      }),
    ).toBe(false);
    expect(shouldOfferAcademicPlacementCarryForward('forbidden', {})).toBe(false);
  });

  it('preserves backend preview token and financial values without recomputing them', () => {
    const normalized = normalizeAcademicPlacementFinancePreview({
      can_apply: true,
      preview_token: 'sha-123',
      target_level_id: 2442,
      target_plan_id: 7959,
      effective_period: { id: 296, period_key: '2027-02' },
      current_agreement: {
        id: 5931,
        fee_plan_id: 7271,
        paid_total: 13300,
        remaining_total: 12700,
      },
      fee_supersessions: [{
        fee_id: 13362,
        fee_type_code: 'TUITION',
        service_code: 'TUITION',
        locked_obligation_total: 9800,
        replaceable_obligation_total: 9200,
        target_future_base: 8000,
        residual_customization: 800,
        target_future_net: 7200,
        future_period_count: 5,
      }],
      preserved_old_only_services: ['TRANSPORT'],
      already_satisfied_one_time: ['REGISTRATION'],
      blocking_reasons: [],
      warnings: [],
    });

    expect(normalized.previewToken).toBe('sha-123');
    expect(normalized.effectivePeriodKey).toBe('2027-02');
    expect(normalized.currentAgreement.paidTotal).toBe(13300);
    expect(normalized.feeSupersessions[0]).toMatchObject({
      lockedObligationTotal: 9800,
      replaceableObligationTotal: 9200,
      targetFutureBase: 8000,
      residualCustomization: 800,
      targetFutureNet: 7200,
    });
    expect(normalized.preservedOldOnlyServices).toEqual(['TRANSPORT']);
    expect(normalized.alreadySatisfiedOneTime).toEqual(['REGISTRATION']);
  });
});
