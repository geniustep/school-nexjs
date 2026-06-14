import { describe, expect, it } from 'vitest';
import {
  resolveFinanceTabLoadPhase,
  shouldShowAgreementEmptyState,
  shouldShowFinanceEmptyState,
  shouldShowFinanceInitialSkeleton,
} from '@/features/admin/student-finance/utils/finance-tab-loading';

describe('finance-tab-loading', () => {
  it('waits for academic year before leaving years phase', () => {
    expect(
      resolveFinanceTabLoadPhase({
        yearsLoading: true,
        effectiveYearId: '',
        workspaceInitialLoading: false,
        agreementId: null,
        agreementDetailInitialLoading: false,
      }),
    ).toBe('years');

    expect(
      resolveFinanceTabLoadPhase({
        yearsLoading: false,
        effectiveYearId: '',
        workspaceInitialLoading: false,
        agreementId: null,
        agreementDetailInitialLoading: false,
      }),
    ).toBe('years');
  });

  it('shows workspace skeleton while workspace initial load is in progress', () => {
    expect(
      resolveFinanceTabLoadPhase({
        yearsLoading: false,
        effectiveYearId: '1',
        workspaceInitialLoading: true,
        agreementId: null,
        agreementDetailInitialLoading: false,
      }),
    ).toBe('workspace');
  });

  it('does not show agreement empty state during loading phases', () => {
    expect(
      shouldShowAgreementEmptyState({
        phase: 'workspace',
        agreement: null,
        workspaceLoaded: false,
      }),
    ).toBe(false);

    expect(
      shouldShowAgreementEmptyState({
        phase: 'ready',
        agreement: null,
        workspaceLoaded: true,
      }),
    ).toBe(true);
  });

  it('does not show finance empty state during loading phases', () => {
    expect(
      shouldShowFinanceEmptyState({
        phase: 'workspace',
        workspaceLoaded: false,
        emptyFinance: true,
      }),
    ).toBe(false);

    expect(
      shouldShowFinanceEmptyState({
        phase: 'ready',
        workspaceLoaded: true,
        emptyFinance: true,
      }),
    ).toBe(true);
  });

  it('uses skeleton helper only before ready phase', () => {
    expect(shouldShowFinanceInitialSkeleton({ phase: 'years' })).toBe(true);
    expect(shouldShowFinanceInitialSkeleton({ phase: 'ready' })).toBe(false);
  });
});
