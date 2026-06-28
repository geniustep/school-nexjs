import { describe, expect, it } from 'vitest';
import { resolveAgreementAmendmentErrorMessage } from './agreement-amendment-errors';
import {
  isLineSelectableForPeriodAmendment,
  resolvePeriodAmendableFromLine,
} from './agreement-amendment-line-eligibility';
import { resolveAgreementLineServiceName, resolveAgreementLineTargetId } from './agreement-amendment-line-display';
import {
  buildAgreementAmendmentPreviewPayload,
  canSubmitAgreementAmendmentForm,
} from './build-agreement-amendment-payload';
import {
  readAmbiguousAgreementLineCandidates,
  isAmbiguousAgreementLineTargetError,
} from './resolve-agreement-amendment-ambiguous-target';
import { resolveAmendmentAgreementLineOptions } from './resolve-amendment-form-options';
import { sortAgreementAmendmentPeriodOptions } from './sort-agreement-amendment-period-options';
import type { FinancialAgreement } from '../types';
import type { AgreementAmendmentFormState } from '../types/agreement-amendment';

describe('agreement amendment contract sync', () => {
  it('preserves real Odoo service_name and does not collapse to generic teaching label', () => {
    const agreement = {
      id: 590,
      student_id: 2436,
      state: 'active',
      lines: [
        {
          agreement_line_id: 1003,
          service_name: 'رسوم التسجيل',
          fee_type_name: 'التدريس',
          commitment_type: 'one_time',
          pricing_unit: 'academic_year',
          period_amendable: false,
          net_amount: 2500,
        },
        {
          agreement_line_id: 1004,
          source_line_id: 1004,
          service_name: 'رسوم التمدرس',
          fee_type_name: 'التدريس',
          commitment_type: 'renewable_subscription',
          pricing_unit: 'month',
          period_amendable: true,
          net_amount: 2000,
        },
      ],
    } as unknown as FinancialAgreement;

    const lines = resolveAmendmentAgreementLineOptions(agreement);
    expect(lines).toHaveLength(2);
    expect(lines[0]?.label).toBe('رسوم التسجيل');
    expect(lines[1]?.label).toBe('رسوم التمدرس');
    expect(resolveAgreementLineServiceName(agreement.lines![0]!)).toBe('رسوم التسجيل');
  });

  it('shows one-time and monthly lines as separate picker entries keyed by target id', () => {
    const lines = resolveAmendmentAgreementLineOptions({
      id: 1,
      lines: [
        { agreement_line_id: 11, service_name: 'A', period_amendable: false },
        { source_line_id: 22, service_name: 'B', period_amendable: true },
      ],
    } as FinancialAgreement);

    expect(lines.map((line) => line.id)).toEqual([11, 22]);
    expect(lines[0]?.periodAmendable).toBe(false);
    expect(lines[1]?.periodAmendable).toBe(true);
  });

  it('marks non-amendable lines as not selectable for period operations', () => {
    const line = resolveAmendmentAgreementLineOptions({
      id: 1,
      lines: [
        {
          id: 50,
          service_name: 'رسوم التسجيل',
          period_amendable: false,
          amendment_block_reason: 'one_time_line_not_period_amendable',
        },
      ],
    } as FinancialAgreement)[0]!;

    expect(isLineSelectableForPeriodAmendment(line)).toBe(false);
    expect(resolvePeriodAmendableFromLine({ period_amendable: false })).toBe(false);
  });

  it('preview payload sends source_line_id and agreement_line_id', () => {
    const lines = resolveAmendmentAgreementLineOptions({
      id: 123,
      lines: [{ agreement_line_id: 900, source_line_id: 901, service_name: 'رسوم التمدرس', period_amendable: true, net_amount: 100 }],
    } as FinancialAgreement);
    const form: AgreementAmendmentFormState = {
      operationType: 'modify_line',
      effectivePeriodId: '456',
      reason: 'QA',
      sourceLineId: String(lines[0]!.id),
      feeTypeId: '',
      amount: '500',
    };

    const payload = buildAgreementAmendmentPreviewPayload(123, form, lines[0]);
    expect(payload.line).toEqual({
      source_line_id: 901,
      agreement_line_id: 900,
      amount: 500,
    });
    expect(canSubmitAgreementAmendmentForm(form, lines[0])).toBe(true);
  });

  it('sorts month rail options by period_start not label text', () => {
    const sorted = sortAgreementAmendmentPeriodOptions([
      { id: 3, label: 'يونيو 2027', periodStart: '2027-06-01' },
      { id: 1, label: 'شتنبر 2026', periodStart: '2026-09-01' },
      { id: 2, label: 'أكتوبر 2026', periodStart: '2026-10-01' },
    ]);
    expect(sorted.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it('handles ambiguous_agreement_line_target with candidate cards', () => {
    expect(isAmbiguousAgreementLineTargetError('ambiguous_agreement_line_target')).toBe(true);
    const candidates = readAmbiguousAgreementLineCandidates({
      code: 'ambiguous_agreement_line_target',
      message: 'Multiple agreement lines match this service. Use source_line_id to select the target line.',
      details: {
        candidates: [
          {
            source_line_id: 1003,
            agreement_line_id: 1003,
            service_name: 'رسوم التسجيل',
            period_amendable: false,
          },
          {
            source_line_id: 1004,
            agreement_line_id: 1004,
            service_name: 'رسوم التمدرس',
            period_amendable: true,
          },
        ],
      },
    });
    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.serviceName).toBe('رسوم التسجيل');
    expect(
      resolveAgreementAmendmentErrorMessage('ambiguous_agreement_line_target', 'raw', (key) =>
        key.endsWith('ambiguousAgreementLineTarget')
          ? 'يوجد أكثر من بند مطابق. اختر البند المطلوب من القائمة.'
          : key,
      ),
    ).toContain('يوجد أكثر من بند مطابق');
  });

  it('resolves target id priority source_line_id > agreement_line_id > id', () => {
    expect(
      resolveAgreementLineTargetId({
        id: 1,
        source_line_id: 9,
        agreement_line_id: 8,
      }),
    ).toBe(9);
    expect(resolveAgreementLineTargetId({ agreement_line_id: 8, id: 1 })).toBe(8);
    expect(resolveAgreementLineTargetId({ id: 1 })).toBe(1);
  });
});
