import { describe, expect, it } from 'vitest';
import {
  buildAgreementLineEditPayload,
  formatAgreementLineQuantityDisplay,
  isAgreementLineQuantityEditable,
  needsAgreementLinePeriodReductionReason,
  resolveAgreementLineQuantityLabelKey,
  validateAgreementLineQuantityValue,
} from './agreement-line-quantity-edit';
import {
  normalizeAgreementLineQuantityEditContract,
  normalizeFinancialAgreementLine,
} from './normalize-financial-agreement-line';
import { normalizeAgreementLineEditPreview } from './normalize-agreement-line-edit-preview';
import { validateAgreementLineEditPatch } from './build-agreement-lines-patch';
import type { FinancialAgreementLine } from '../types';

import type { TranslateFn } from '@/features/i18n/locale-context';

const translate: TranslateFn = (key, params) => {
  const table: Record<string, string> = {
    'admin.student360.financialAgreement.customization.quantityDisplay.oneTime': 'مرة واحدة',
    'admin.student360.financialAgreement.customization.quantityDisplay.periodCount': `${params?.count ?? ''} فترات`,
    'admin.student360.financialAgreement.customization.quantityDisplay.itemCount': `الكمية: ${params?.count ?? ''}`,
    'common.dash': '—',
  };
  return table[key] ?? key;
};

const monthlyLine: FinancialAgreementLine = {
  id: 102,
  service_id: 2,
  service_name: 'التمدرس',
  quantity: 10,
  periods_count: 10,
  schedule_period_count: 10,
  schedule_total: 16000,
  unit_price: 1600,
  commitment_type: 'recurring',
  quantity_edit_contract: {
    quantity_semantics: 'period_count',
    current_quantity: 10,
    max_quantity: 10,
    quantity_allowed: true,
  },
};

const registrationLine: FinancialAgreementLine = {
  id: 101,
  service_id: 1,
  service_name: 'التسجيل',
  quantity: 1,
  commitment_type: 'one_time',
  quantity_edit_contract: {
    quantity_semantics: 'fixed_one_time',
    current_quantity: 1,
    max_quantity: 1,
    quantity_allowed: false,
    quantity_readonly_reason: 'one_time_fee',
  },
};

describe('normalizeFinancialAgreementLine quantity_edit_contract', () => {
  it('reads quantity_edit_contract from API payload', () => {
    const line = normalizeFinancialAgreementLine({
      id: 102,
      service_id: 2,
      quantity: 10,
      periods_count: 10,
      schedule_period_count: 10,
      schedule_total: 16000,
      quantity_edit_contract: {
        quantity_semantics: 'period_count',
        current_quantity: 10,
        max_quantity: 10,
        quantity_allowed: true,
      },
    });

    expect(line?.quantity_edit_contract).toEqual({
      quantity_semantics: 'period_count',
      current_quantity: 10,
      max_quantity: 10,
      quantity_allowed: true,
      quantity_readonly_reason: null,
    });
    expect(line?.periods_count).toBe(10);
    expect(line?.schedule_total).toBe(16000);
  });

  it('normalizes quantity_edit_contract helper', () => {
    expect(
      normalizeAgreementLineQuantityEditContract({
        quantity_semantics: 'fixed_one_time',
        quantity_allowed: false,
      }),
    ).toEqual({
      quantity_semantics: 'fixed_one_time',
      current_quantity: undefined,
      max_quantity: undefined,
      quantity_allowed: false,
      quantity_readonly_reason: null,
    });
  });
});

describe('formatAgreementLineQuantityDisplay', () => {
  it('shows period count for monthly lines', () => {
    expect(formatAgreementLineQuantityDisplay(translate, monthlyLine)).toBe('10 فترات');
  });

  it('shows one-time label for registration lines', () => {
    expect(formatAgreementLineQuantityDisplay(translate, registrationLine)).toBe('مرة واحدة');
  });

  it('does not leak technical terms in Arabic display strings', () => {
    const text = formatAgreementLineQuantityDisplay(translate, monthlyLine);
    expect(text).not.toMatch(/odoo|api|endpoint|orm|traceback/i);
  });
});

describe('agreement line quantity edit UX', () => {
  it('uses period count label for monthly lines', () => {
    expect(resolveAgreementLineQuantityLabelKey('period_count')).toBe(
      'admin.student360.financialAgreement.customization.fields.periodCountLabel',
    );
  });

  it('blocks quantity edit for one-time lines', () => {
    expect(isAgreementLineQuantityEditable(registrationLine)).toBe(false);
  });

  it('rejects values above max_quantity', () => {
    const result = validateAgreementLineQuantityValue({ line: monthlyLine, value: 11 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorKey).toBe('quantityMax');
  });

  it('requires reason when reducing period count below max', () => {
    expect(
      needsAgreementLinePeriodReductionReason({ line: monthlyLine, nextQuantity: 9 }),
    ).toBe(true);
  });
});

describe('buildAgreementLineEditPayload', () => {
  it('builds preview payload with periods_count for monthly lines', () => {
    const payload = buildAgreementLineEditPayload({
      lineId: 102,
      quantityValue: 9,
      quantitySemantics: 'period_count',
      discountType: 'none',
      discountValue: 0,
      reason: 'QA preview only',
    });

    expect(payload.lines?.[0]).toEqual({
      id: 102,
      periods_count: 9,
      discount_type: 'none',
      discount_value: 0,
      reason: 'QA preview only',
    });
  });

  it('passes edit patch validation without forbidden metadata', () => {
    const payload = buildAgreementLineEditPayload({
      lineId: 102,
      quantityValue: 9,
      quantitySemantics: 'period_count',
      discountType: 'fixed',
      discountValue: 500,
      reason: 'Test',
    });

    const validation = validateAgreementLineEditPatch({
      sourceLines: [monthlyLine],
      lineId: 102,
      payload,
    });
    expect(validation.ok).toBe(true);
  });
});

describe('normalizeAgreementLineEditPreview', () => {
  it('surfaces requires_schedule_regeneration with admin-friendly preview data', () => {
    const preview = normalizeAgreementLineEditPreview({
      allowed: true,
      requires_schedule_regeneration: true,
      lines: [
        {
          id: 102,
          before: {
            periods_count: 10,
            unit_price: 1600,
            discount_amount: 0,
            net_amount: 16000,
            schedule_total: 16000,
          },
          after: {
            periods_count: 9,
            net_amount: 14400,
            schedule_total: 14400,
          },
        },
      ],
    }, 102);

    expect(preview.allowed).toBe(true);
    expect(preview.requiresScheduleRegeneration).toBe(true);
    expect(preview.before?.periods_count).toBe(10);
    expect(preview.after?.periods_count).toBe(9);
  });

  it('marks blocked preview as not allowed for save', () => {
    const preview = normalizeAgreementLineEditPreview({ blocked: true, error_message: 'Not allowed' }, 102);
    expect(preview.allowed).toBe(false);
    expect(preview.blocked).toBe(true);
  });
});

describe('preview before PATCH contract', () => {
  it('PATCH payload mirrors preview payload for safe save flow', () => {
    const previewPayload = buildAgreementLineEditPayload({
      lineId: 102,
      quantityValue: 10,
      quantitySemantics: 'period_count',
      discountType: 'percent',
      discountValue: 5,
      reason: 'Sibling discount',
      internalNote: 'QA only',
    });

    expect(previewPayload.lines?.[0]).toMatchObject({
      id: 102,
      periods_count: 10,
      discount_type: 'percent',
      discount_value: 5,
      reason: 'Sibling discount',
      internal_note: 'QA only',
    });
  });
});