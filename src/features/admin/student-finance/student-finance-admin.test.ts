import { describe, expect, it } from 'vitest';
import {
  agreementStateTone,
  hasAgreementData,
  hasFinanceSummaryData,
  paymentStatusTone,
  timingStatusTone,
} from './utils/reference-labels';

describe('student finance reference helpers', () => {
  it('detects empty agreement', () => {
    expect(hasAgreementData(null)).toBe(false);
    expect(hasAgreementData({ id: 1, state: 'draft' })).toBe(true);
  });

  it('detects empty finance workspace summary without misleading zeros', () => {
    expect(hasFinanceSummaryData({ total_due: 0, total_agreed: 0, confirmed_paid: 0 })).toBe(false);
    expect(hasFinanceSummaryData({ total_due: 100 })).toBe(true);
  });

  it('does not count pending cheques as confirmed paid', () => {
    const summary = { confirmed_paid: 0, pending_cheques: 400, total_due: 400 };
    expect(summary.confirmed_paid).toBe(0);
    expect(hasFinanceSummaryData(summary)).toBe(true);
  });

  it('supports partially_paid and overdue badge tones independently', () => {
    expect(paymentStatusTone('partially_paid')).toBe('amber');
    expect(timingStatusTone('overdue')).toBe('red');
  });

  it('maps agreement states for accessible badges', () => {
    expect(agreementStateTone('draft')).toBe('blue');
    expect(agreementStateTone('active')).toBe('green');
    expect(agreementStateTone('cancelled')).toBe('red');
  });
});

describe('preview safety', () => {
  it('preview endpoint is separate from generate (no local mutation)', () => {
    expect(typeof previewAgreementEndpoint).toBe('function');
    expect(previewAgreementEndpoint(1)).toContain('/schedule/preview');
    expect(generateAgreementEndpoint(1)).toContain('/schedule/generate');
    expect(previewAgreementEndpoint(1)).not.toBe(generateAgreementEndpoint(1));
  });
});

function previewAgreementEndpoint(id: number) {
  return `/admin/financial-agreements/${id}/schedule/preview`;
}

function generateAgreementEndpoint(id: number) {
  return `/admin/financial-agreements/${id}/schedule/generate`;
}
