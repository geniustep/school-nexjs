import { describe, expect, it } from 'vitest';
import type { StudentFinanceWorkspace } from '../types';
import {
  parseFinanceOperationDescription,
  resolveFinanceOperationsHistory,
} from './resolve-finance-operations-history';
import { normalizeChangePlanPreview } from './normalize-change-plan-preview';

describe('parseFinanceOperationDescription', () => {
  it('splits Backend label — reason (من effective) pattern', () => {
    expect(
      parseFinanceOperationDescription('إلغاء بند من الاتفاق — الغاء التخفيض (من 2026-09)'),
    ).toEqual({
      reason: 'الغاء التخفيض',
      effectiveFrom: '2026-09',
    });
  });

  it('supports English from marker', () => {
    expect(
      parseFinanceOperationDescription('Agreement line modified — tuition cut (from 2026-09)'),
    ).toEqual({
      reason: 'tuition cut',
      effectiveFrom: '2026-09',
    });
  });
});

describe('resolveFinanceOperationsHistory agreement line aliases', () => {
  it('maps agreement_line_* and amend aliases to known kinds (not unknown)', () => {
    const entries = resolveFinanceOperationsHistory({
      summary: {},
      finance_operations_history: [
        {
          id: 'amm-47',
          date: '2026-07-01',
          operation_type: 'agreement_line_modified',
          description: 'تعديل بند في الاتفاق — تخفيض (من 2026-09)',
          service_name: 'رسوم التمدرس',
          amount: 100,
          currency: { id: 1, name: 'MAD' },
          reference: 'AMM-00047',
        },
        {
          id: 'amm-48',
          date: '2026-07-02',
          operation_type: 'cancel_line',
          description: 'إلغاء بند من الاتفاق — الغاء التخفيض (من 2026-09)',
          service_name: 'رسوم التمدرس',
          amount: -16000,
          currency: { id: 1, name: 'MAD' },
          reference: 'AMM-00048',
        },
        {
          id: 'amm-50',
          date: '2026-07-03',
          operation_type: 'add_line',
          description: 'إضافة بند للاتفاق — اضافة النقل (من 2026-09)',
          service_name: 'النقل',
          amount: 5000,
          currency: { id: 1, name: 'MAD' },
          reference: 'AMM-00050',
        },
      ],
    } as StudentFinanceWorkspace);

    expect(entries.map((e) => e.operationKind)).toEqual([
      'agreement_line_modified',
      'agreement_line_cancelled',
      'agreement_line_added',
    ]);
    expect(entries.every((e) => e.operationKind !== 'unknown')).toBe(true);
    expect(entries[0]?.reason).toBe('تخفيض');
    expect(entries[0]?.effectiveFrom).toBe('2026-09');
    expect(entries[0]?.affectedServiceLabel).toBe('رسوم التمدرس');
    expect(entries[0]?.amountMeaningKey).toContain('agreement_line_modified');
    expect(entries[1]?.amount).toBe(-16000);
    expect(entries[1]?.amountMeaningKey).toContain('agreement_line_cancelled');
    expect(entries[2]?.affectedServiceLabel).toBe('النقل');
    expect(entries[2]?.amountMeaningKey).toContain('agreement_line_added');
  });
});

describe('normalizeChangePlanPreview retired contract', () => {
  it('marks deprecated social preview as non-applicable with retired blocker', () => {
    const preview = normalizeChangePlanPreview({
      deprecated: true,
      can_apply: false,
      blocking_reasons: ['legacy_special_adjustment_retired'],
      replacement_workflow: 'agreement_amendments',
      replacement_operation: 'modify_line',
    });
    expect(preview.deprecated).toBe(true);
    expect(preview.canApply).toBe(false);
    expect(preview.blockingReasons).toContain('legacy_special_adjustment_retired');
    expect(preview.replacementWorkflow).toBe('agreement_amendments');
    expect(preview.replacementOperation).toBe('modify_line');
  });
});
