import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('Finance Command Center decision intelligence UI contract', () => {
  const page = source(
    'src/features/admin/finance/command-center/finance-command-center-page.tsx',
  );
  const sheet = source(
    'src/features/admin/finance/command-center/decision-intelligence-sheet.tsx',
  );

  it('uses the decision sheet as the primary KPI and aging interaction', () => {
    expect(page).toContain('DecisionIntelligenceSheet');
    expect(page).not.toContain('function kpiHref');
    expect(page).not.toContain("quick = item.key === 'current' ? 'has_balance' : 'overdue_unpaid'");
  });

  it('keeps exact aging targets backend-owned instead of mapping 90+ to generic overdue', () => {
    expect(page).toContain('item.drilldown');
    expect(page).not.toContain('quick=overdue_unpaid');
    expect(page).not.toContain('quick=has_balance');
  });

  it('loads explain and drilldown on demand and keeps previous decision data disabled', () => {
    expect(sheet).toContain('financeCommandCenterExplain');
    expect(sheet).toContain('financeCommandCenterDrilldown');
    expect(sheet.match(/keepPreviousData: false/g) ?? []).toHaveLength(2);
  });

  it('defaults comparison to backend as-of previous and current months without selectors or client-side deltas', () => {
    expect(page).toContain('comparisonPeriodKeys(data.meta.as_of_date)');
    expect(page).toContain("admin.finance.commandCenter.period.previous_month");
    expect(page).toContain("admin.finance.commandCenter.decision.currentMonthToDate");
    expect(page).not.toContain('fcc-month-comparison__selectors');
    expect(page).not.toMatch(/delta|growth|variancePercent|differenceAmount/);
  });

  it('never renders raw backend formulas and avoids the duplicated rate drill-down table', () => {
    expect(sheet).not.toContain('<code dir="ltr">{explanation.formula}</code>');
    expect(sheet).toContain("metricKey !== 'collection_rate_to_date'");
    expect(sheet).toContain('rateNoDuplicateTable');
  });

  it('links exact records to the governed student finance workspace with a safe return path', () => {
    expect(sheet).toContain("/admin/students/${studentId}?tab=finance");
    expect(sheet).toContain("encodeURIComponent('/admin/finance/command-center')");
    expect(sheet).toContain('admin.finance.commandCenter.decision.openStudentFinance');
  });

  it('uses metric-specific financial columns instead of one repeated records table', () => {
    expect(sheet).toContain("metricKey === 'due_to_date'");
    expect(sheet).toContain("metricKey === 'recognized_collected_to_date'");
    expect(sheet).toContain("metricKey === 'overdue'");
    expect(sheet).toContain("metricKey === 'aging'");
    expect(sheet).toContain("metricKey === 'collection_performance'");
  });
});
