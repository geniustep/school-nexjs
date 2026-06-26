import { describe, expect, it } from 'vitest';
import {
  buildResetFinancialAgreementPayload,
  canSubmitResetFinancialAgreement,
} from './build-reset-financial-agreement-payload';
import {
  resolveResetFinancialAgreementErrorMessage,
  resetFinancialAgreementErrorMessageKey,
} from './reset-financial-agreement-errors';
import type { StudentFinanceWorkspace } from '../types';

describe('buildResetFinancialAgreementPayload', () => {
  it('7) sends reason and mode, with academic_year_id when available', () => {
    const payload = buildResetFinancialAgreementPayload('  تصحيح اتفاق  ', {
      summary: {},
      academic_year: { id: 123, name: '2026-2027' },
    } as StudentFinanceWorkspace);
    expect(payload).toEqual({
      reason: 'تصحيح اتفاق',
      mode: 'rebuild_from_current_fee_plan',
      academic_year_id: 123,
    });
  });

  it('omits academic_year_id when unavailable', () => {
    const payload = buildResetFinancialAgreementPayload('reason', { summary: {} } as StudentFinanceWorkspace);
    expect(payload).toEqual({
      reason: 'reason',
      mode: 'rebuild_from_current_fee_plan',
    });
    expect('academic_year_id' in payload).toBe(false);
  });
});

describe('canSubmitResetFinancialAgreement', () => {
  it('6) blocks submit without reason', () => {
    expect(canSubmitResetFinancialAgreement('')).toBe(false);
    expect(canSubmitResetFinancialAgreement('   ')).toBe(false);
    expect(canSubmitResetFinancialAgreement('valid reason')).toBe(true);
  });
});

describe('resetFinancialAgreementErrorMessageKey', () => {
  it('9) maps financial_impact_exists to a user-facing key', () => {
    expect(resetFinancialAgreementErrorMessageKey('financial_impact_exists')).toContain('financialImpactExists');
  });

  it('10) maps reset_reason_required to a user-facing key', () => {
    expect(resetFinancialAgreementErrorMessageKey('reset_reason_required')).toContain('reasonRequired');
  });
});

describe('resolveResetFinancialAgreementErrorMessage', () => {
  const t = (key: string) => key;

  it('falls back to generic message for unknown codes', () => {
    expect(resolveResetFinancialAgreementErrorMessage('unknown_code', undefined, t)).toContain('generic');
  });
});
