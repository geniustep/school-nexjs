import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeFinanceOverview } from '@/lib/utils/finance-normalize';

const AR_MESSAGES = JSON.parse(readFileSync(resolve('messages/ar.json'), 'utf8')).admin.finance.hub as Record<
  string,
  string
>;
const EN_MESSAGES = JSON.parse(readFileSync(resolve('messages/en.json'), 'utf8')).admin.finance.hub as Record<
  string,
  string
>;

function renderPaidStudentsHint(locale: 'ar' | 'en', count: number): string {
  const template =
    locale === 'ar' ? AR_MESSAGES.kpiTotalDuePaidStudentsHint : EN_MESSAGES.kpiTotalDuePaidStudentsHint;
  return template.replace('{count}', String(count));
}

describe('normalizeFinanceOverview paid_students_count', () => {
  it('passes paid_students_count from nested totals', () => {
    const overview = normalizeFinanceOverview({
      totals: {
        total_due: 1000,
        students_with_balance: 52,
        paid_students_count: 22,
      },
    });
    expect(overview?.totals?.paid_students_count).toBe(22);
    expect(overview?.totals?.students_with_balance).toBe(52);
  });

  it('passes paid_students_count from flat overview payload', () => {
    const overview = normalizeFinanceOverview({
      total_due: 1000,
      students_with_balance: 52,
      paid_students_count: 22,
    });
    expect(overview?.totals?.paid_students_count).toBe(22);
    expect(overview?.totals?.students_with_balance).toBe(52);
  });

  it('leaves paid_students_count undefined when backend omits it', () => {
    const overview = normalizeFinanceOverview({
      totals: {
        total_due: 1000,
        students_with_balance: 52,
      },
    });
    expect(overview?.totals?.paid_students_count).toBeUndefined();
    expect(overview?.totals?.students_with_balance).toBe(52);
  });
});

describe('FinanceHubKpiGrid paid students contract', () => {
  const source = readFileSync(resolve('src/features/admin/finance/finance-hub-kpi-grid.tsx'), 'utf8');

  it('uses paid_students_count for total due hint', () => {
    expect(source.includes('paid_students_count')).toBe(true);
    expect(source.includes('kpiTotalDuePaidStudentsHint')).toBe(true);
  });

  it('does not use students_with_balance for paid students hint', () => {
    const hintBlock = source.slice(source.indexOf("key: 'total_due'"), source.indexOf("key: 'settled'"));
    expect(hintBlock.includes('students_with_balance')).toBe(false);
    expect(hintBlock.includes('paid_students_count')).toBe(true);
  });

  it('keeps students_with_balance available elsewhere in finance hub', () => {
    const attentionSource = readFileSync(
      resolve('src/features/admin/finance/finance-hub-attention-utils.ts'),
      'utf8',
    );
    expect(attentionSource.includes('students_with_balance')).toBe(true);
  });
});

describe('paid students hint translations', () => {
  it('renders Arabic label with explicit paid meaning', () => {
    expect(renderPaidStudentsHint('ar', 22)).toBe('التلاميذ المؤدّون: 22');
    expect(renderPaidStudentsHint('ar', 22)).not.toContain('برصيد');
  });

  it('renders English label without fully-paid semantics', () => {
    const hint = renderPaidStudentsHint('en', 22);
    expect(hint).toBe('Students who paid: 22');
    expect(hint.toLowerCase()).not.toContain('fully paid');
    expect(hint.toLowerCase()).not.toContain('settled');
  });
});

describe('missing paid_students_count safe hint behavior', () => {
  it('does not synthesize paid hint from students_with_balance', () => {
    const overview = normalizeFinanceOverview({
      totals: {
        total_due: 1000,
        students_with_balance: 52,
      },
    });
    const paidCount = overview?.totals?.paid_students_count;
    const balanceCount = overview?.totals?.students_with_balance;
    expect(paidCount).toBeUndefined();
    expect(balanceCount).toBe(52);
    expect(paidCount ?? null).not.toBe(balanceCount);
  });
});
