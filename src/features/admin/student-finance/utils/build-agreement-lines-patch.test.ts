import { describe, expect, it } from 'vitest';
import {
  buildAgreementLineAddInput,
  buildAgreementLineAddPayload,
  buildAgreementLineDeletePayload,
  buildAgreementLineDiscountPatchPayload,
  buildAgreementLinesReplacePayload,
  computeAgreementLineAmounts,
  hasAgreementLinePricingRecurrenceMetadata,
  isAgreementLinePricingRecurrenceOdooError,
  isSpecialUnitPrice,
  pickAgreementLineMetadata,
  pickTariffMetadata,
  resolveAgreementLineAddMetadata,
  resolveAgreementLineAddQuantity,
  resolveAgreementLineReasonKind,
  resolveDefaultUnitPrice,
  serializeAgreementLineForPatch,
  validateAgreementLineAddPatch,
  validateAgreementLineDeletePatch,
  validateAgreementLineDiscountPatch,
  validateAgreementLinePatchSafety,
  validateAgreementLineReason,
  validateAgreementLinesReplacePatch,
} from './build-agreement-lines-patch';
import type { FinanceServiceTariff, FinancialAgreementLine } from '../types';
import {
  canGenerateAgreementSchedule,
  canPreviewAgreementSchedule,
  isAgreementEditableBeforeActivation,
} from './resolve-agreement-draft-customization';

const sampleLines: FinancialAgreementLine[] = [
  { id: 1, service_id: 10, quantity: 1, unit_price: 2500, discount_amount: 0, is_selected: true },
  { id: 2, service_id: 11, quantity: 1, unit_price: 400, discount_amount: 50, is_selected: true },
];

/** Fixture mirroring FA/2026/00003 tuition line on nibras (student 5). */
const fa202600003Lines: FinancialAgreementLine[] = [
  {
    id: 101,
    service_id: 1,
    service_name: 'التسجيل',
    quantity: 1,
    unit_price: 2000,
    discount_amount: 0,
    commitment_type: 'one_time',
    pricing_unit: 'academic_year',
    is_selected: true,
  },
  {
    id: 102,
    service_id: 2,
    service_name: 'التمدرس',
    fee_plan_line_id: 55,
    quantity: 10,
    unit_price: 1600,
    discount_type: 'fixed',
    discount_value: 2000,
    discount_amount: 2000,
    commitment_type: 'recurring',
    pricing_unit: 'month',
    charge_generation_mode: 'monthly',
    service_from: '2026-09-01',
    service_until: '2027-06-30',
    is_selected: true,
  },
  {
    id: 103,
    service_id: 3,
    service_name: 'النقل',
    quantity: 10,
    unit_price: 400,
    discount_amount: 0,
    commitment_type: 'recurring',
    pricing_unit: 'month',
    is_selected: true,
  },
];

describe('buildAgreementLineDiscountPatchPayload', () => {
  it('sends line id and changed discount fields only', () => {
    const payload = buildAgreementLineDiscountPatchPayload({
      lineId: 102,
      discountType: 'fixed',
      discountValue: 1500,
      reason: 'Sibling discount',
    });
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines?.[0]).toEqual({
      id: 102,
      discount_type: 'fixed',
      discount_value: 1500,
      reason: 'Sibling discount',
    });
    expect(payload.lines?.[0]).not.toHaveProperty('quantity');
    expect(payload.lines?.[0]).not.toHaveProperty('fee_plan_line_id');
    expect(payload.lines?.[0]).not.toHaveProperty('service_id');
  });

  it('does not send quantity: null', () => {
    const payload = buildAgreementLineDiscountPatchPayload({
      lineId: 2,
      discountType: 'percent',
      discountValue: 5,
    });
    const row = payload.lines?.[0] as Record<string, unknown>;
    expect(row.quantity).toBeUndefined();
    expect(row).not.toHaveProperty('quantity', null);
  });

  it('does not send fee_plan_line_id: null', () => {
    const payload = buildAgreementLineDiscountPatchPayload({
      lineId: 102,
      discountType: 'none',
      discountValue: 0,
    });
    const row = payload.lines?.[0] as Record<string, unknown>;
    expect(row.fee_plan_line_id).toBeUndefined();
    expect(row).not.toHaveProperty('fee_plan_line_id', null);
  });

  it('passes safety validation for FA/2026/00003 tuition discount edit', () => {
    const payload = buildAgreementLineDiscountPatchPayload({
      lineId: 102,
      discountType: 'fixed',
      discountValue: 2500,
      reason: 'QA discount note',
    });
    const result = validateAgreementLineDiscountPatch({
      sourceLines: fa202600003Lines,
      lineId: 102,
      payload,
    });
    expect(result.ok).toBe(true);
  });
});

describe('serializeAgreementLineForPatch', () => {
  it('maps discount_value from discount_amount fallback', () => {
    const row = serializeAgreementLineForPatch(sampleLines[1]!);
    expect(row.discount_value).toBe(50);
  });

  it('preserves billing metadata from Odoo response', () => {
    const tuition = fa202600003Lines[1]!;
    const row = serializeAgreementLineForPatch(tuition);
    expect(row.quantity).toBe(10);
    expect(row.fee_plan_line_id).toBe(55);
    expect(row.commitment_type).toBe('recurring');
    expect(row.pricing_unit).toBe('month');
    expect(row.charge_generation_mode).toBe('monthly');
    expect(row.service_from).toBe('2026-09-01');
    expect(row.service_until).toBe('2027-06-30');
  });

  it('does not default quantity to 1 when missing from response', () => {
    const line: FinancialAgreementLine = { id: 9, service_id: 3, unit_price: 100 };
    const row = serializeAgreementLineForPatch(line);
    expect(row.quantity).toBeUndefined();
  });

  it('does not send tariff_id: null when absent', () => {
    const row = serializeAgreementLineForPatch(sampleLines[0]!);
    expect(row.tariff_id).toBeUndefined();
  });
});

describe('pickAgreementLineMetadata', () => {
  it('copies only present metadata keys', () => {
    const meta = pickAgreementLineMetadata(fa202600003Lines[1]!);
    expect(meta).toMatchObject({
      fee_plan_line_id: 55,
      commitment_type: 'recurring',
      pricing_unit: 'month',
    });
    expect(meta).not.toHaveProperty('period_start');
  });
});

describe('buildAgreementLinesReplacePayload', () => {
  it('serializes existing lines for full replace patch with metadata', () => {
    const payload = buildAgreementLinesReplacePayload({ lines: fa202600003Lines });
    expect(payload.lines).toHaveLength(3);
    const tuition = payload.lines?.find((l) => l.id === 102);
    expect(tuition?.quantity).toBe(10);
    expect((tuition as Record<string, unknown>).fee_plan_line_id).toBe(55);
  });

  it('updates discount on one line while preserving unit_price and metadata', () => {
    const payload = buildAgreementLinesReplacePayload({
      lines: fa202600003Lines,
      updateLine: {
        id: 102,
        patch: { discount_type: 'fixed', discount_value: 100, reason: 'Sibling discount' },
      },
    });
    const updated = payload.lines?.find((l) => l.id === 102);
    expect(updated?.unit_price).toBe(1600);
    expect(updated?.quantity).toBe(10);
    expect((updated as Record<string, unknown>).fee_plan_line_id).toBe(55);
    expect(updated?.discount_type).toBe('fixed');
    expect(updated?.discount_value).toBe(100);
  });

  it('excludes deleted line from replace payload', () => {
    const payload = buildAgreementLinesReplacePayload({ lines: sampleLines, excludeLineId: 2 });
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines?.[0]?.id).toBe(1);
  });

  it('appends a new line without id', () => {
    const payload = buildAgreementLinesReplacePayload({
      lines: sampleLines,
      appendLine: { service_id: 12, quantity: 1, unit_price: 100, is_selected: true },
    });
    expect(payload.lines).toHaveLength(3);
    expect(payload.lines?.[2]).toMatchObject({ service_id: 12, unit_price: 100 });
    expect(payload.lines?.[2]?.id).toBeUndefined();
  });

  it('blocks delete when source lines are empty but agreement net is positive', () => {
    const payload = buildAgreementLinesReplacePayload({ lines: [], excludeLineId: 1 });
    const result = validateAgreementLinesReplacePatch({
      sourceLines: [],
      operation: 'delete',
      payload: payload as { lines: Array<{ id?: number }> },
      excludeLineId: 1,
      agreementNetAmount: 4900,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('lines_not_loaded');
  });

  it('blocks update when patch would drop a patchable line', () => {
    const linesWithGap: FinancialAgreementLine[] = [
      ...sampleLines,
      { id: 3, quantity: 1, unit_price: 10 } as FinancialAgreementLine,
    ];
    const payload = buildAgreementLinesReplacePayload({
      lines: linesWithGap,
      updateLine: { id: 2, patch: { discount_type: 'fixed', discount_value: 75 } },
    });
    const result = validateAgreementLinesReplacePatch({
      sourceLines: linesWithGap,
      operation: 'update',
      payload: payload as { lines: Array<{ id?: number }> },
      updateLineId: 2,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('incomplete_patchable_lines');
  });

  it('accepts safe delete payload counts', () => {
    const payload = buildAgreementLinesReplacePayload({ lines: sampleLines, excludeLineId: 2 });
    const result = validateAgreementLinesReplacePatch({
      sourceLines: sampleLines,
      operation: 'delete',
      payload: payload as { lines: Array<{ id?: number }> },
      excludeLineId: 2,
      agreementNetAmount: 2900,
    });
    expect(result.ok).toBe(true);
  });

  it('FA/2026/000003 tuition keeps quantity=10 after full-replace discount patch', () => {
    const payload = buildAgreementLinesReplacePayload({
      lines: fa202600003Lines,
      updateLine: { id: 102, patch: { discount_type: 'fixed', discount_value: 2000 } },
    });
    const tuition = payload.lines?.find((l) => l.id === 102);
    expect(tuition?.quantity).toBe(10);
    const safety = validateAgreementLinePatchSafety({
      operation: 'full_replace',
      sourceLines: fa202600003Lines,
      payload,
    });
    expect(safety.ok).toBe(true);
  });
});

describe('buildAgreementLineDeletePayload', () => {
  it('uses explicit line_ids_to_delete', () => {
    const payload = buildAgreementLineDeletePayload(102);
    expect(payload).toEqual({ line_ids_to_delete: [102] });
    expect(payload.lines).toBeUndefined();
  });

  it('passes delete validation without accidental line omission', () => {
    const payload = buildAgreementLineDeletePayload(2);
    const result = validateAgreementLineDeletePatch({
      sourceLines: sampleLines,
      lineId: 2,
      payload,
    });
    expect(result.ok).toBe(true);
  });
});

describe('buildAgreementLineAddPayload', () => {
  const transportTariff: FinanceServiceTariff = {
    id: 501,
    service_id: 3,
    commitment_type: 'recurring',
    pricing_unit: 'month',
    charge_generation_mode: 'monthly',
    unit_price: 400,
  };

  it('sends only the new line with metadata when tariff template is available', () => {
    const addLine = buildAgreementLineAddInput({
      service_id: 3,
      quantity: 10,
      unit_price: 400,
      is_selected: true,
      tariffs: [transportTariff],
    });
    const payload = buildAgreementLineAddPayload(addLine);
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines?.[0]?.id).toBeUndefined();
    expect(payload.lines?.[0]).toMatchObject({
      service_id: 3,
      quantity: 10,
      unit_price: 400,
      commitment_type: 'recurring',
      pricing_unit: 'month',
      charge_generation_mode: 'monthly',
    });
    expect(validateAgreementLineAddPatch({ payload }).ok).toBe(true);
  });

  it('does not send null tariff_id', () => {
    const addLine = buildAgreementLineAddInput({
      service_id: 12,
      quantity: 1,
      unit_price: 100,
      is_selected: true,
      selectedTariff: {
        id: 9,
        commitment_type: 'one_time',
        pricing_unit: 'academic_year',
        unit_price: 100,
      },
    });
    const payload = buildAgreementLineAddPayload(addLine);
    expect(payload.lines?.[0]).not.toHaveProperty('tariff_id', null);
  });

  it('uses manual price without tariff_id while keeping metadata from fee type tariffs', () => {
    const addLine = buildAgreementLineAddInput({
      service_id: 3,
      quantity: 10,
      unit_price: 400,
      is_selected: true,
      tariffs: [transportTariff],
    });
    expect(addLine.tariff_id).toBeUndefined();
    expect(addLine).toMatchObject({
      commitment_type: 'recurring',
      pricing_unit: 'month',
      unit_price: 400,
    });
  });

  it('forces quantity=1 for one-time metadata', () => {
    const addLine = buildAgreementLineAddInput({
      service_id: 1,
      quantity: 10,
      unit_price: 2000,
      is_selected: true,
      selectedTariff: {
        id: 11,
        commitment_type: 'one_time',
        pricing_unit: 'academic_year',
      },
    });
    expect(addLine.quantity).toBe(1);
  });

  it('blocks add payload without pricing/recurrence metadata', () => {
    const payload = buildAgreementLineAddPayload({
      service_id: 12,
      quantity: 1,
      unit_price: 100,
      is_selected: true,
    });
    const result = validateAgreementLineAddPatch({ payload });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing_pricing_recurrence_metadata');
  });
});

describe('resolveAgreementLineAddMetadata', () => {
  it('prefers selected tariff metadata', () => {
    const metadata = resolveAgreementLineAddMetadata({
      serviceId: 3,
      selectedTariff: {
        id: 1,
        commitment_type: 'recurring',
        pricing_unit: 'month',
      },
      tariffs: [
        {
          id: 2,
          commitment_type: 'one_time',
          pricing_unit: 'academic_year',
        },
      ],
    });
    expect(metadata).toEqual({
      commitment_type: 'recurring',
      pricing_unit: 'month',
    });
  });

  it('falls back to template tariff when no tariff is selected', () => {
    const metadata = resolveAgreementLineAddMetadata({
      serviceId: 3,
      tariffs: [
        {
          id: 501,
          commitment_type: 'recurring',
          pricing_unit: 'month',
          charge_generation_mode: 'monthly',
        },
      ],
    });
    expect(metadata).toEqual({
      commitment_type: 'recurring',
      pricing_unit: 'month',
      charge_generation_mode: 'monthly',
    });
  });

  it('detects incomplete metadata', () => {
    expect(hasAgreementLinePricingRecurrenceMetadata({ commitment_type: 'recurring' })).toBe(false);
    expect(
      hasAgreementLinePricingRecurrenceMetadata({
        commitment_type: 'recurring',
        pricing_unit: 'month',
      }),
    ).toBe(true);
  });

  it('maps Odoo pricing/recurrence validation errors', () => {
    expect(
      isAgreementLinePricingRecurrenceOdooError(
        'Cannot create agreement line without required pricing and recurrence metadata.',
      ),
    ).toBe(true);
    expect(isAgreementLinePricingRecurrenceOdooError('Permission denied')).toBe(false);
  });

  it('resolves one-time quantity helper', () => {
    expect(
      resolveAgreementLineAddQuantity(10, {
        commitment_type: 'one_time',
        pricing_unit: 'academic_year',
      }),
    ).toBe(1);
    expect(
      resolveAgreementLineAddQuantity(10, {
        commitment_type: 'recurring',
        pricing_unit: 'month',
      }),
    ).toBe(10);
  });
});

describe('validateAgreementLinePatchSafety', () => {
  it('blocks full-replace that would strip fee_plan_line_id metadata', () => {
    const unsafePayload = {
      lines: [
        {
          id: 102,
          service_id: 2,
          quantity: 1,
          unit_price: 1600,
          discount_type: 'fixed',
          discount_value: 2000,
        },
      ],
    };
    const result = validateAgreementLinePatchSafety({
      operation: 'full_replace',
      sourceLines: fa202600003Lines,
      payload: unsafePayload,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('line_metadata_stripped');
  });

  it('blocks discount patch that includes quantity', () => {
    const payload = {
      lines: [{ id: 102, discount_type: 'fixed', discount_value: 100, quantity: 10 }],
    };
    const result = validateAgreementLinePatchSafety({
      operation: 'discount',
      sourceLines: fa202600003Lines,
      payload,
      targetLineId: 102,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toContain('quantity');
  });

  it('does not infer recurrence from service name', () => {
    const lineNamedMonthly: FinancialAgreementLine = {
      id: 50,
      service_id: 9,
      service_name: 'رسوم شهرية',
      quantity: 10,
      unit_price: 500,
      commitment_type: 'recurring',
      pricing_unit: 'month',
    };
    const payload = buildAgreementLineDiscountPatchPayload({
      lineId: 50,
      discountType: 'fixed',
      discountValue: 50,
    });
    const row = payload.lines?.[0] as Record<string, unknown>;
    expect(row.commitment_type).toBeUndefined();
    expect(row.pricing_unit).toBeUndefined();
    expect(
      validateAgreementLineDiscountPatch({
        sourceLines: [lineNamedMonthly],
        lineId: 50,
        payload,
      }).ok,
    ).toBe(true);
  });
});

describe('agreement line reason rules', () => {
  it('does not require reason when adding a line without discount or special price', () => {
    const result = validateAgreementLineReason(
      { mode: 'add', discountType: 'none', unitPrice: 100, defaultPrice: 100 },
      '',
    );
    expect(result.ok).toBe(true);
    expect(resolveAgreementLineReasonKind({ mode: 'add', discountType: 'none', unitPrice: 100, defaultPrice: 100 })).toBe(
      'optional',
    );
  });

  it('requires reason when adding a line with discount', () => {
    const result = validateAgreementLineReason(
      { mode: 'add', discountType: 'percent', discountValue: 10, unitPrice: 100, defaultPrice: 100 },
      '',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe('discountReasonRequired');
  });

  it('requires reason when adding a line with special price vs known default', () => {
    expect(isSpecialUnitPrice(120, 100)).toBe(true);
    const result = validateAgreementLineReason(
      { mode: 'add', discountType: 'none', unitPrice: 120, defaultPrice: 100 },
      '',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe('specialPriceReasonRequired');
  });

  it('does not treat entered price as special when default price is unknown', () => {
    expect(resolveDefaultUnitPrice({ service: { default_amount: 0 }, tariff: null })).toBeNull();
    const result = validateAgreementLineReason(
      { mode: 'add', discountType: 'none', unitPrice: 999, defaultPrice: null },
      '',
    );
    expect(result.ok).toBe(true);
  });

  it('preserves unit_price when editing an existing line via full replace', () => {
    const payload = buildAgreementLinesReplacePayload({
      lines: sampleLines,
      updateLine: { id: 1, patch: { discount_type: 'percent', discount_value: 5 } },
    });
    expect(payload.lines?.find((l) => l.id === 1)?.unit_price).toBe(2500);
  });

  it('requires reason when editing an existing line with discount', () => {
    const result = validateAgreementLineReason(
      { mode: 'edit', discountType: 'fixed', discountValue: 200 },
      '',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe('discountReasonRequired');
  });

  it('does not require reason when editing an existing line without discount', () => {
    const result = validateAgreementLineReason({ mode: 'edit', discountType: 'none' }, '');
    expect(result.ok).toBe(true);
  });

  it('requires reason when deleting a line', () => {
    const result = validateAgreementLineReason({ mode: 'delete', discountType: 'none' }, '');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe('deleteReasonRequired');
  });
});

describe('computeAgreementLineAmounts', () => {
  it('computes net after percent discount', () => {
    const amounts = computeAgreementLineAmounts({
      unitPrice: 2500,
      quantity: 1,
      discountType: 'percent',
      discountValue: 10,
    });
    expect(amounts.gross).toBe(2500);
    expect(amounts.discount).toBe(250);
    expect(amounts.net).toBe(2250);
  });
});

describe('resolve-agreement-draft-customization', () => {
  it('allows edit only for draft/pending/approved with edit action', () => {
    expect(isAgreementEditableBeforeActivation('draft', { edit: true })).toBe(true);
    expect(isAgreementEditableBeforeActivation('pending_approval', { edit: true })).toBe(true);
    expect(isAgreementEditableBeforeActivation('approved', { edit: true })).toBe(true);
    expect(isAgreementEditableBeforeActivation('active', { edit: true })).toBe(false);
    expect(isAgreementEditableBeforeActivation('draft', { edit: false })).toBe(false);
  });

  it('reads schedule actions from allowed_actions', () => {
    expect(canPreviewAgreementSchedule({ preview_schedule: true })).toBe(true);
    expect(canGenerateAgreementSchedule({ generate_schedule: true })).toBe(true);
  });
});
