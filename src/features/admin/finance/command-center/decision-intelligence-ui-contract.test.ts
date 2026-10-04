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

  it('keeps comparison side-by-side without client-side financial deltas', () => {
    expect(page).toContain('fcc-month-comparison');
    expect(page).not.toMatch(/delta|growth|variancePercent|differenceAmount/);
  });
});
