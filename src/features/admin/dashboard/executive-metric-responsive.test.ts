import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readCss(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

describe('executive finance summary responsive numeric CSS', () => {
  const css = readCss('src/app/admin-workspace.css');

  it('makes panel body and metric tiles container-query aware', () => {
    expect(css).toMatch(/\.exec-panel__body\s*\{[^}]*container-type:\s*inline-size/s);
    expect(css).toMatch(/container-name:\s*exec-panel-body/);
    expect(css).toMatch(/\.exec-metric-tile\s*\{[^}]*container-type:\s*inline-size/s);
  });

  it('reflows metric grid by container width instead of a fixed 3-column lock', () => {
    expect(css).toMatch(/@container\s+exec-panel-body\s*\(min-width:\s*280px\)/);
    expect(css).toMatch(/@container\s+exec-panel-body\s*\(min-width:\s*420px\)/);
    expect(css).toMatch(
      /@container\s+exec-panel-body\s*\(min-width:\s*420px\)\s*\{[^}]*grid-template-columns:\s*repeat\(3/s,
    );
  });

  it('uses bounded fluid typography (cqi) without horizontal scroll on metric values', () => {
    expect(css).toMatch(/\.exec-metric-tile__value\s*\{[^}]*clamp\([^)]*cqi[^)]*\)/s);
    expect(css).not.toMatch(/\.exec-metric-tile__value\s*\{[^}]*overflow-x:\s*auto/s);
    expect(css).not.toMatch(/\.exec-kpi__value\s*\{[^}]*overflow-x:\s*auto/s);
  });

  it('keeps finance amounts inheriting tile fluid size while remaining nowrap via shared class', () => {
    expect(css).toMatch(
      /\.exec-metric-tile__value\s+\.finance-amount[\s\S]*?font-size:\s*inherit/,
    );
    const globals = readCss('src/app/globals.css');
    expect(globals).toMatch(/\.finance-amount\s*,[\s\S]*?white-space:\s*nowrap/);
  });
});

describe('similar dense money KPI containers from stage-1 regression', () => {
  it('student finance exec summary uses container reflow without overflow-x on values', () => {
    const css = readCss('src/features/admin/students/student-360.css');
    expect(css).toMatch(/container-name:\s*student-finance-exec-summary/);
    expect(css).toMatch(/\.student-finance-exec-summary__kpi-value\s*\{[^}]*clamp\([^)]*cqi/s);
    expect(css).not.toMatch(
      /\.student-finance-exec-summary__kpi-value\s*\{[^}]*overflow-x:\s*auto/s,
    );
  });

  it('finance billing KPI values use cqi fluid type without overflow-x', () => {
    const css = readCss('src/features/admin/finance/finance-ui.css');
    expect(css).toMatch(/\.finance-billing-kpi__value\s*\{[^}]*clamp\([^)]*cqi/s);
    expect(css).not.toMatch(/\.finance-billing-kpi__value\s*\{[^}]*overflow-x:\s*auto/s);
  });
});
