import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (file: string): string =>
  readFileSync(resolve(process.cwd(), file), 'utf8');

const requiredKeys = [
  'title', 'asOf', 'runtimeUnavailable', 'unavailable',
  'attributionNote', 'programmedNote',
  'academic_year_programmed_total', 'due_to_date',
  'recognized_collected_to_date', 'remaining_due_to_date',
  'overdue_amount', 'future_scheduled_amount',
  'collection_rate_to_date',
] as const;

describe('Finance canonical legacy-runtime visibility', () => {
  it('hides the optional canonical section if the current Odoo runtime has no canonical metrics', () => {
    const code = source('src/features/admin/finance/command-center/finance-command-center-page.tsx');
    const start = code.indexOf('function SummarySection');
    const end = code.indexOf('function periodLabel', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const section = code.slice(start, end);
    expect(section).toContain('const canonical = parseFinanceCanonicalMetrics(');
    expect(section).toMatch(/\{canonical \? \(\s*<FinanceCanonicalKpis/);
    expect(section).toContain(') : null}');
    expect(section).not.toContain('metrics={null}');
  });

  it.each(['ar', 'fr', 'en', 'es'])('keeps already-approved financial metric translations in %s', locale => {
    const dictionary = JSON.parse(source(`messages/${locale}.json`));
    const canonical = dictionary.admin?.finance?.canonical;
    expect(canonical).toBeTruthy();
    for (const key of requiredKeys) {
      const label = canonical[key];
      expect(typeof label, `Missing ${locale}: admin.finance.canonical.${key}`).toBe('string');
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label).not.toContain('admin.finance.canonical.');
    }
  });

  it('keeps meaningful French wording for the optional contract', () => {
    const dictionary = JSON.parse(source('messages/fr.json'));
    expect(dictionary.admin.finance.canonical.runtimeUnavailable)
      .toContain('Les indicateurs');
  });
});
