import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const page = src('src/features/admin/finance/command-center/finance-command-center-page.tsx');
const css = src('src/features/admin/finance/command-center/command-center.css');
const ar = JSON.parse(src('messages/ar.json'));

describe('Finance dashboard truthful UX', () => {
  it('removes the two date cards and redundant subtitles', () => {
    const context = page.slice(page.indexOf('function ContextBar'), page.indexOf('function MetricCard'));
    expect(context).not.toContain('commandCenter.asOf');
    expect(context).not.toContain('commandCenter.lastUpdated');
    expect(page).not.toContain("commandCenter.subtitle')}</p>");
    expect(page).not.toContain("positionSubtitle')}</p>");
  });
  it('consumes non-periodic fees directly from the backend', () => {
    expect(page).toContain('data.non_periodic_charges ?');
    expect(page).toContain('data.non_periodic_charges.remaining_amount');
    expect(page).not.toContain('160450');
  });
  it('distinguishes future periods without invented bar heights', () => {
    expect(page).toContain('commandCenter.paidInAdvance');
    expect(css).toContain('.fcc-performance__month--future');
    expect(page).not.toContain('Math.max(4,');
    expect(page).not.toContain('Math.max(2,');
  });
  it('keeps overdue proportions relative only to overdue items', () => {
    expect(page).toContain("const current = data.items.find((item) => item.key === 'current')");
    expect(page).toContain("const overdueItems = data.items.filter((item) => item.key !== 'current')");
    expect(page).toContain('item.percentage_of_overdue');
    expect(page).not.toContain('const max = Math.max(1, ...data.items.map');
  });
  it('shows count units and keeps explanatory basis hidden by default', () => {
    expect(page).toContain('commandCenter.attentionUnit.');
    expect(page).toContain('fcc-attention__count');
    expect(page).toContain('<details className="fcc-performance__basis-help">');
    expect(page).not.toContain('<p className="fcc-performance__basis">');
  });
  it('uses a dedicated non-periodic paid label', () => {
    const start = page.indexOf('<section className="fcc-non-periodic"');
    const end = page.indexOf('<details className="fcc-performance__details">', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const nonPeriodic = page.slice(start, end);
    expect(nonPeriodic).toContain('commandCenter.nonPeriodic.paid');
    expect(nonPeriodic).toContain('commandCenter.nonPeriodic.total');
    expect(nonPeriodic).toContain('commandCenter.nonPeriodic.remaining');
    expect(nonPeriodic).toContain('commandCenter.nonPeriodic.helpLabel');
    expect(nonPeriodic).toContain('commandCenter.nonPeriodic.description');
    expect(nonPeriodic).not.toContain("commandCenter.collected')}</dt>");
  });
  it('labels 90-plus day alerts with an explicit billing-account count', () => {
    expect(page).toContain("item.type === 'arrears_90_plus'");
    expect(page).toContain('commandCenter.arrearsAccountsCountLabel');
  });
  it('uses the Moroccan Arabic finance dashboard vocabulary', () => {
    const c = ar.admin.finance.commandCenter;
    expect(c.title).toBe('لوحة القيادة المالية');
    expect(c.kpi.due).toBe('المستحقات إلى اليوم');
    expect(c.kpi.collected).toBe('المؤدى من المستحقات');
    expect(c.kpi.overdue).toBe('المتأخرات');
    expect(c.performanceTitle).toBe('الأقساط حسب شهر الاستحقاق');
    expect(c.decision.explainTitle).toBe('كيف احتُسب هذا الرقم؟');
    expect(c.decision.definition.rate).not.toContain('الواجبات');
    expect(JSON.stringify(c)).not.toContain('الواجبات');
    expect(c.collectionRate).toBe('نسبة الاستخلاص');
    expect(c.nonPeriodic.title).toBe('رسوم أخرى');
    expect(c.nonPeriodic.total).toBe('إجمالي الرسوم');
    expect(c.nonPeriodic.count).toBe('عدد الرسوم المسجلة');
    expect(c.aging.current).toBe('المبالغ غير المتأخرة');
    expect(c.performanceBasis).toBe('كل شهر يبيّن أقساطه وما أُدّي منها حتى اليوم.');
    expect(ar.nav.financeCommandCenter).toBe('لوحة القيادة المالية');
  });
});
