import { describe, expect, it } from 'vitest';
import {
  buildAgreementLinesReplacePayload,
  computeAgreementLineAmounts,
  isSpecialUnitPrice,
  resolveAgreementLineReasonKind,
  resolveDefaultUnitPrice,
  serializeAgreementLineForPatch,
  validateAgreementLineReason,
  validateAgreementLinesReplacePatch,
} from './build-agreement-lines-patch';
import type { FinancialAgreementLine } from '../types';
import {
  canGenerateAgreementSchedule,
  canPreviewAgreementSchedule,
  isAgreementEditableBeforeActivation,
} from './resolve-agreement-draft-customization';

const sampleLines: FinancialAgreementLine[] = [
  { id: 1, service_id: 10, quantity: 1, unit_price: 2500, discount_amount: 0, is_selected: true },
  { id: 2, service_id: 11, quantity: 1, unit_price: 400, discount_amount: 50, is_selected: true },
];

describe('buildAgreementLinesReplacePayload', () => {
  it('serializes existing lines for full replace patch', () => {
    const payload = buildAgreementLinesReplacePayload({ lines: sampleLines });
    expect(payload.lines).toHaveLength(2);
    expect(payload.lines[0]).toMatchObject({ id: 1, service_id: 10, unit_price: 2500 });
  });

  it('updates discount on one line while preserving unit_price', () => {
    const payload = buildAgreementLinesReplacePayload({
      lines: sampleLines,
      updateLine: {
        id: 2,
        patch: { discount_type: 'fixed', discount_value: 100, reason: 'Sibling discount' },
      },
    });
    const updated = payload.lines.find((l) => l.id === 2);
    expect(updated?.unit_price).toBe(400);
    expect(updated?.discount_type).toBe('fixed');
    expect(updated?.discount_value).toBe(100);
    expect(payload.lines.find((l) => l.id === 1)?.unit_price).toBe(2500);
  });

  it('excludes deleted line from replace payload', () => {
    const payload = buildAgreementLinesReplacePayload({ lines: sampleLines, excludeLineId: 2 });
    expect(payload.lines).toHaveLength(1);
    expect(payload.lines[0]?.id).toBe(1);
  });

  it('appends a new line without id', () => {
    const payload = buildAgreementLinesReplacePayload({
      lines: sampleLines,
      appendLine: { service_id: 12, quantity: 1, unit_price: 100, is_selected: true },
    });
    expect(payload.lines).toHaveLength(3);
    expect(payload.lines[2]).toMatchObject({ service_id: 12, unit_price: 100 });
    expect(payload.lines[2]?.id).toBeUndefined();
  });

  it('blocks delete when source lines are empty but agreement net is positive', () => {
    const payload = buildAgreementLinesReplacePayload({ lines: [], excludeLineId: 1 });
    const result = validateAgreementLinesReplacePatch({
      sourceLines: [],
      operation: 'delete',
      payload,
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
      payload,
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
      payload,
      excludeLineId: 2,
      agreementNetAmount: 2900,
    });
    expect(result.ok).toBe(true);
  });
});

describe('serializeAgreementLineForPatch', () => {
  it('maps discount_value from discount_amount fallback', () => {
    const row = serializeAgreementLineForPatch(sampleLines[1]!);
    expect(row.discount_value).toBe(50);
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

  it('preserves unit_price when editing an existing line', () => {
    const payload = buildAgreementLinesReplacePayload({
      lines: sampleLines,
      updateLine: { id: 1, patch: { discount_type: 'percent', discount_value: 5 } },
    });
    expect(payload.lines.find((l) => l.id === 1)?.unit_price).toBe(2500);
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
