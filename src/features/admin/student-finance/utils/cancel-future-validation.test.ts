import { describe, expect, it } from 'vitest';
import { validateCancelFutureInstallments } from './cancel-future-validation';

describe('validateCancelFutureInstallments', () => {
  it('requires effective date', () => {
    expect(
      validateCancelFutureInstallments({
        effectiveDate: '',
        reason: 'test',
        targetState: 'cancelled',
      }),
    ).toBe('dateRequired');
  });

  it('requires reason', () => {
    expect(
      validateCancelFutureInstallments({
        effectiveDate: '2026-06-01',
        reason: '   ',
        targetState: 'cancelled',
      }),
    ).toBe('reasonRequired');
  });

  it('accepts cancelled and waived only', () => {
    expect(
      validateCancelFutureInstallments({
        effectiveDate: '2026-06-01',
        reason: 'parent request',
        targetState: 'invalid',
      }),
    ).toBe('targetRequired');
    expect(
      validateCancelFutureInstallments({
        effectiveDate: '2026-06-01',
        reason: 'parent request',
        targetState: 'waived',
      }),
    ).toBeNull();
  });
});
