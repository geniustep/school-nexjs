import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFinanceHubAttentionItems } from '@/features/admin/finance/finance-hub-attention-utils';
import { FINANCE_DEEP_LINKS, financeDeepLinkHref } from '@/features/admin/finance/finance-deep-links';
import {
  CHEQUE_QUICK_FILTERS,
  INSTALLMENT_QUICK_FILTERS,
  isChequeQuickFilter,
  isInstallmentQuickFilter,
} from '@/features/admin/finance/finance-filter-contracts';
import { parseFinanceQuickListResponse } from '@/lib/utils/finance-list-response';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';
import type { AdminFinanceOverview } from '@/types/finance';

const LIVE_ATTENTION: AdminFinanceOverview['attention'] = {
  overdue_installments: { count: 1, amount: 50, quick: 'overdue_unpaid' },
  cheques_due_soon: { count: 0, amount: 0, quick: 'due_next_7_days', window_days: 7 },
  cheques_rejected: { count: 2, amount: 650, quick: 'rejected' },
  draft_collections: { count: 2, amount: 1000, state: 'draft' },
};

describe('finance deep links registry', () => {
  it('maps overdue installments to quick=overdue_unpaid', () => {
    expect(financeDeepLinkHref('overdueInstallments')).toBe('/admin/finance/installments?quick=overdue_unpaid');
  });

  it('maps cheques due soon to quick=due_next_7_days not due_today', () => {
    expect(financeDeepLinkHref('chequesDueSoon')).toBe('/admin/finance/cheques?quick=due_next_7_days');
    expect(financeDeepLinkHref('chequesDueSoon')).not.toContain('due_today');
  });

  it('maps rejected cheques and draft collections', () => {
    expect(financeDeepLinkHref('chequesRejected')).toBe('/admin/finance/cheques?quick=rejected');
    expect(financeDeepLinkHref('draftCollections')).toBe('/admin/finance/collections?state=draft');
  });

  it('maps cashflow installment windows to contract quick values', () => {
    expect(FINANCE_DEEP_LINKS.installmentsDueNext7Days.query?.quick).toBe('due_next_7_days');
    expect(FINANCE_DEEP_LINKS.installmentsDueNext30Days.query?.quick).toBe('due_next_30_days');
  });
});

describe('finance filter contracts', () => {
  it('accepts published installment quick filters', () => {
    for (const quick of ['overdue_unpaid', 'due_today', 'due_next_7_days', 'due_next_30_days', 'has_balance', 'all']) {
      expect(isInstallmentQuickFilter(quick)).toBe(true);
      expect(INSTALLMENT_QUICK_FILTERS).toContain(quick);
    }
  });

  it('accepts published cheque quick filters', () => {
    for (const quick of ['due_today', 'due_next_7_days', 'overdue', 'rejected', 'collected', 'all']) {
      expect(isChequeQuickFilter(quick)).toBe(true);
      expect(CHEQUE_QUICK_FILTERS).toContain(quick);
    }
  });

  it('rejects unknown quick filters', () => {
    expect(isInstallmentQuickFilter('due_7_days')).toBe(false);
    expect(isChequeQuickFilter('pending')).toBe(false);
  });
});

describe('finance list response normalization', () => {
  it('parses array shape without quick', () => {
    const parsed = parseFinanceQuickListResponse<{ id: number }>([{ id: 1 }, { id: 2 }]);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.summary).toBeNull();
  });

  it('parses object shape with quick', () => {
    const parsed = parseFinanceQuickListResponse<{ id: number }>({
      items: [{ id: 9 }],
      summary: { total_count: 1, total_amount: 50, total_remaining: 50 },
      applied_filters: { quick: 'overdue_unpaid' },
    });
    expect(parsed.items).toHaveLength(1);
    expect(parsed.summary?.total_count).toBe(1);
    expect(parsed.summary?.total_remaining).toBe(50);
    expect(parsed.appliedFilters?.quick).toBe('overdue_unpaid');
  });

  it('parses cheques due_next_7_days empty summary', () => {
    const parsed = parseFinanceQuickListResponse({
      items: [],
      summary: { total_count: 0, total_amount: 0 },
      applied_filters: { quick: 'due_next_7_days', date_from: '2026-06-16', date_to: '2026-06-23' },
    });
    expect(parsed.summary?.total_count).toBe(0);
    expect(parsed.summary?.total_amount).toBe(0);
  });
});

describe('finance hub attention from overview.attention', () => {
  const overview = normalizeFinanceOverview({
    attention: LIVE_ATTENTION,
    totals: { draft_agreements_count: 0, uncovered_amount: 0 },
  });

  it('builds overdue link from attention block', () => {
    const alerts = buildFinanceHubAttentionItems({ overview });
    const overdue = alerts.find((a) => a.key === 'overdue_installments');
    expect(overdue?.href).toBe('/admin/finance/installments?quick=overdue_unpaid');
    expect(overdue?.count).toBe(1);
    expect(overdue?.amount).toBe(50);
  });

  it('does not show cheques due soon card when count is zero', () => {
    const alerts = buildFinanceHubAttentionItems({ overview });
    expect(alerts.some((a) => a.key === 'cheques_due_soon')).toBe(false);
  });

  it('uses rejected quick filter for rejected cheques', () => {
    const alerts = buildFinanceHubAttentionItems({ overview });
    const rejected = alerts.find((a) => a.key === 'cheques_rejected');
    expect(rejected?.href).toBe('/admin/finance/cheques?quick=rejected');
    expect(rejected?.count).toBe(2);
    expect(rejected?.amount).toBe(650);
  });

  it('does not use due_today for cheques due soon deep link anywhere in hub sources', () => {
    const hubDir = path.resolve('src/features/admin/finance');
    const files = fs
      .readdirSync(hubDir)
      .filter((name) => name.startsWith('finance-hub') && (name.endsWith('.tsx') || name.endsWith('.ts')));
    for (const file of files) {
      const source = fs.readFileSync(path.join(hubDir, file), 'utf8');
      if (source.includes('cheques_due_soon') || source.includes('chequesDueSoon')) {
        expect(source.includes('quick=due_today')).toBe(false);
      }
    }
  });
});

describe('finance hub dashboard reconciliation', () => {
  it('matches dashboard overdue metrics to destination quick filter', () => {
    const overview = normalizeFinanceOverview({ attention: LIVE_ATTENTION });
    const alerts = buildFinanceHubAttentionItems({ overview });
    const overdue = alerts.find((a) => a.key === 'overdue_installments');
    expect(overview?.attention?.overdue_installments?.count).toBe(overdue?.count);
    expect(overview?.attention?.overdue_installments?.amount).toBe(overdue?.amount);
  });

  it('matches cheques due soon zero state without inventing totals', () => {
    const overview = normalizeFinanceOverview({ attention: LIVE_ATTENTION });
    expect(overview?.attention?.cheques_due_soon?.count).toBe(0);
    expect(financeDeepLinkHref('chequesDueSoon')).toContain('due_next_7_days');
  });
});

describe('finance i18n raw keys guard', () => {
  const locales = ['ar', 'en', 'fr', 'es'] as const;

  for (const locale of locales) {
    it(`does not leave raw admin.finance keys in ${locale} cheques filters`, () => {
      const messages = JSON.parse(
        fs.readFileSync(path.resolve(`messages/${locale}.json`), 'utf8'),
      ) as Record<string, unknown>;
      const cheques = (messages.admin as Record<string, unknown>).finance as Record<string, unknown>;
      const filters = (cheques.cheques as Record<string, unknown>).filters as Record<string, string>;
      for (const value of Object.values(filters)) {
        expect(value.startsWith('admin.finance.')).toBe(false);
        expect(value.startsWith('filters.')).toBe(false);
      }
    });
  }
});

describe('finance pages URL contract', () => {
  it('installments page is school-wide without student picker gate', () => {
    const source = fs.readFileSync(path.resolve('src/app/admin/finance/installments/page.tsx'), 'utf8');
    expect(source.includes('FinanceHubStudentScope')).toBe(false);
    expect(source.includes('financeInstallments')).toBe(false);
    expect(source.includes('InstallmentsListPanel')).toBe(true);
    expect(source.includes('searchParams')).toBe(true);
  });

  it('cheques page keeps URL handling in the page and list normalization in the panel', () => {
    const pageSource = fs.readFileSync(path.resolve('src/app/admin/finance/cheques/page.tsx'), 'utf8');
    const panelSource = fs.readFileSync(path.resolve('src/features/admin/finance/cheques-list-panel.tsx'), 'utf8');
    expect(pageSource.includes("quick: searchParams.get('quick')")).toBe(true);
    expect(panelSource.includes('parseFinanceQuickListResponse')).toBe(true);
    expect(panelSource.includes('due_next_7_days')).toBe(true);
    expect(pageSource.includes("state: 'received'")).toBe(false);
    expect(panelSource.includes('useChequeCount')).toBe(false);
  });
});