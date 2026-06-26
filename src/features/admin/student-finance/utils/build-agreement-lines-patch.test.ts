import { describe, expect, it } from 'vitest';
import {
  buildAgreementLinesReplacePayload,
  serializeAgreementLineForPatch,
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

  it('updates one line while keeping siblings', () => {
    const payload = buildAgreementLinesReplacePayload({
      lines: sampleLines,
      updateLine: { id: 2, patch: { unit_price: 450, reason: 'Sibling discount' } },
    });
    expect(payload.lines.find((l) => l.id === 2)?.unit_price).toBe(450);
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
      updateLine: { id: 2, patch: { unit_price: 450 } },
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
