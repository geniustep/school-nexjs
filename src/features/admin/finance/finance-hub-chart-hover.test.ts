import { describe, expect, it } from 'vitest';

describe('finance hub collection trend hover stability', () => {
  it('renders tooltip outside bar plot flow with plot-level mouse leave', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const source = fs.readFileSync(
      path.resolve('src/features/admin/finance/finance-hub-charts.tsx'),
      'utf8',
    );

    expect(source.includes('CollectionTrendTooltip')).toBe(true);
    expect(source.includes('role="tooltip"')).toBe(true);
    expect(source.includes('finance-hub-bar-chart__plot finance-hub-bar-chart__plot--filled')).toBe(true);
    expect(source.includes('onMouseLeave={() => setActive(null)}')).toBe(true);
    expect(source.match(/onMouseLeave=\{\(\) => setActive\(null\)\}/g)?.length).toBeGreaterThanOrEqual(2);

    const barButtonBlock = source.slice(
      source.indexOf('finance-hub-bar-chart__bar-wrap'),
      source.indexOf('finance-hub-bar-chart__value'),
    );
    expect(barButtonBlock.includes('onMouseLeave')).toBe(false);
  });

  it('keeps tooltip out of layout flow and non-interactive', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const css = fs.readFileSync(path.resolve('src/features/admin/finance/finance-ui.css'), 'utf8');

    expect(css.includes('.finance-hub-chart-tooltip {')).toBe(true);
    expect(css.includes('position: absolute')).toBe(true);
    expect(css.includes('pointer-events: none')).toBe(true);
    expect(css.includes('.finance-hub-trend--bars')).toBe(true);
    expect(css.includes('position: relative')).toBe(true);
  });

  it('uses fixed bar plot height and opacity-only hover feedback', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const css = fs.readFileSync(path.resolve('src/features/admin/finance/finance-ui.css'), 'utf8');

    expect(css.includes('height: 140px')).toBe(true);
    expect(css.includes('min-height: 140px')).toBe(true);
    expect(css.includes('max-height: 140px')).toBe(true);
    expect(css.includes('opacity: 0.82')).toBe(true);
    expect(css.includes('transform: scale')).toBe(false);
  });

  it('does not change chart data builders or collection filters', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const source = fs.readFileSync(
      path.resolve('src/features/admin/finance/finance-hub-charts.tsx'),
      'utf8',
    );

    expect(source.includes('buildCollectionTrend')).toBe(true);
    expect(source.includes("state: 'confirmed'")).toBe(true);
    expect(source.includes('financeDeepLinkHref')).toBe(false);
  });
});
