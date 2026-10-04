import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('Finance Command Center compact visual contract', () => {
  const page = source(
    'src/features/admin/finance/command-center/finance-command-center-page.tsx',
  );
  const css = source(
    'src/features/admin/finance/command-center/command-center.css',
  );

  const contextSection = page.slice(
    page.indexOf('function ContextBar'),
    page.indexOf('function MetricCard'),
  );
  const summarySection = page.slice(
    page.indexOf('function SummarySection'),
    page.indexOf('function periodLabel'),
  );
  const performanceSection = page.slice(
    page.indexOf('function PerformanceSection'),
    page.indexOf('function AgingSection'),
  );

  it('keeps the visible KPI set without the unavailable liquidity card', () => {
    expect(summarySection.match(/<MetricCard/g) ?? []).toHaveLength(5);
    expect(summarySection.match(/\bcompact\b/g) ?? []).toHaveLength(1);
    expect(summarySection).not.toContain(
      'admin.finance.commandCenter.kpi.availableLiquidity',
    );
    expect(summarySection).toContain(
      'admin.finance.commandCenter.kpi.expectedLiquidity30',
    );
  });

  it('keeps the detailed performance table collapsed by default', () => {
    expect(performanceSection).toContain(
      '<details className="fcc-performance__details">',
    );
    expect(performanceSection).not.toContain(
      '<details open className="fcc-performance__details">',
    );
    expect(performanceSection).toContain(
      'admin.finance.commandCenter.showDetails',
    );
    expect(performanceSection).toContain(
      'admin.finance.commandCenter.hideDetails',
    );
  });

  it('preserves all five financial detail columns', () => {
    for (const key of [
      'periodColumn',
      'due',
      'collected',
      'collectionRate',
      'remaining',
    ]) {
      expect(performanceSection).toContain(
        `admin.finance.commandCenter.${key}`,
      );
    }
  });

  it('renders backend period order as-is without frontend sorting', () => {
    expect(performanceSection).toContain('data.items.map');
    expect(performanceSection).not.toContain('.sort(');
    expect(performanceSection).not.toContain('toSorted(');
  });

  it('keeps locale-aware period presentation and logical RTL-safe CSS', () => {
    expect(page).toContain('new Intl.DateTimeFormat');
    expect(page).toContain("ar: 'ar-MA'");
    expect(page).toContain("fr: 'fr-FR'");
    expect(page).toContain("en: 'en-US'");
    expect(page).toContain("es: 'es-ES'");
    expect(css).toContain('border-inline-start');
    expect(css).toContain('margin-block-start');
  });

  it('enforces the compact hierarchy without restoring local context filters', () => {
    expect(css).toContain('min-height: 106px');
    expect(css).toContain('grid-template-rows: 128px auto auto');
    expect(css).toContain('.fcc-kpi--compact');
    expect(page).not.toContain('setActiveAcademicYear');
    expect(page).not.toContain('activeSchool?.name');
    expect(contextSection).not.toContain('<select');
  });
});
