import { describe, expect, it } from 'vitest';
import type { PaymentCollection } from '@/types/finance';
import type { FinanceReviewBillingPartnerPresentation } from '../types/finance-review';
import {
  pickLatestRecentCollection,
  readCollectionReceiptNumber,
} from './resolve-latest-collection-preview';
import { shouldShowFinanceReviewCollectionsLink } from './resolve-finance-review-collections-link';
import { buildStudentFinanceWorkspaceHref } from './student-finance-sub-tab';

const student26LatestCollection: PaymentCollection = {
  id: 19,
  amount: 1000,
  payment_method: 'cash',
  payment_date: '2026-06-20',
  receipt_number: 'REC/NIBRAS/2026/000004',
  state: 'confirmed',
};

describe('latest collection overview preview', () => {
  it('1) preview data exists when recent_collections is non-empty', () => {
    const latest = pickLatestRecentCollection([student26LatestCollection]);
    expect(latest).not.toBeNull();
    expect(latest?.amount).toBe(1000);
    expect(latest?.payment_method).toBe('cash');
  });

  it('2) preview hidden when recent_collections is empty', () => {
    expect(pickLatestRecentCollection([])).toBeNull();
    expect(pickLatestRecentCollection(undefined)).toBeNull();
  });

  it('3) receipt number displayed when available', () => {
    expect(readCollectionReceiptNumber(student26LatestCollection)).toBe('REC/NIBRAS/2026/000004');
    expect(
      readCollectionReceiptNumber({
        id: 1,
        receipt: { receipt_number: 'REC/2026/000001' },
      }),
    ).toBe('REC/2026/000001');
  });

  it('picks the most recent collection by date', () => {
    const latest = pickLatestRecentCollection([
      { id: 1, payment_date: '2026-01-01', amount: 100 },
      { id: 2, payment_date: '2026-06-20', amount: 1000 },
    ]);
    expect(latest?.id).toBe(2);
  });
});

describe('collections subtab navigation', () => {
  it('4) CTA URL targets collections subtab', () => {
    expect(buildStudentFinanceWorkspaceHref(26, 'collections')).toBe(
      '/admin/students/26?tab=finance&financeSubTab=collections',
    );
  });

  it('6) CTA preserves student route', () => {
    expect(buildStudentFinanceWorkspaceHref(26, 'collections')).toContain('/admin/students/26');
    expect(buildStudentFinanceWorkspaceHref(26, 'collections')).toContain('tab=finance');
  });
});

describe('blocked billing partner review collections link', () => {
  const blockedMismatch: FinanceReviewBillingPartnerPresentation = {
    agreementPartnerName: 'Partner A',
    profilePartnerName: 'Partner B',
    resolutionAvailable: false,
    resolutionBlockReason:
      'توجد عمليات مالية مؤكدة؛ لا يمكن مواءمة شريك الفوترة دون المساس بالسجلات التاريخية.',
    resolutionMessage: null,
    resolutionStrategy: null,
    agreementId: 23,
  };

  it('5) blocked billing partner review shows financial history CTA eligibility', () => {
    expect(shouldShowFinanceReviewCollectionsLink(blockedMismatch)).toBe(true);
  });

  it('does not show collections link when resolution is available', () => {
    expect(
      shouldShowFinanceReviewCollectionsLink({
        ...blockedMismatch,
        resolutionAvailable: true,
      }),
    ).toBe(false);
  });

  it('does not infer confirmed operations without backend block reason', () => {
    expect(
      shouldShowFinanceReviewCollectionsLink({
        ...blockedMismatch,
        resolutionBlockReason: null,
      }),
    ).toBe(false);
  });
});
