import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFinanceServiceFormPayload } from '@/features/admin/finance/finance-service-form-payload';

const formSource = readFileSync(
  resolve('src/features/admin/finance/finance-service-form.tsx'),
  'utf8',
);
const panelSource = readFileSync(
  resolve('src/features/admin/finance/services-tariffs-panel.tsx'),
  'utf8',
);

describe('finance service form UX cleanup', () => {
  it('does not render requires_subscription in the form UI', () => {
    expect(formSource).not.toContain('requiresSubscription');
    expect(formSource).not.toContain('requires_subscription');
    expect(formSource).not.toContain("t('admin.finance.services.columns.requiresSubscription')");
  });

  it('does not render requires_usage_tracking in the form UI', () => {
    expect(formSource).not.toContain('requiresUsageTracking');
    expect(formSource).not.toContain('requires_usage_tracking');
    expect(formSource).not.toContain("t('admin.finance.services.columns.requiresUsageTracking')");
  });

  it('keeps code and description only under advanced settings', () => {
    const advancedStart = formSource.indexOf('finance-collection-advanced');
    const advancedBlock = formSource.slice(advancedStart);
    expect(advancedBlock).toContain("t('admin.finance.services.columns.code')");
    expect(advancedBlock).toContain("t('common.description')");
    expect(advancedBlock).not.toContain('requires_subscription');
    expect(advancedBlock).not.toContain('requires_usage_tracking');
  });

  it('does not show hidden flags in the services table', () => {
    expect(panelSource).not.toContain('requires_subscription');
    expect(panelSource).not.toContain('requires_usage_tracking');
    expect(panelSource).not.toContain('requiresSubscription');
    expect(panelSource).not.toContain('requiresUsageTracking');
  });

  it('keeps collection priority selector intact', () => {
    expect(formSource).toContain('COLLECTION_ALLOCATION_PRIORITY_LEVELS');
    expect(formSource).toContain('allocation_priority_level');
  });
});

describe('buildFinanceServiceFormPayload', () => {
  const baseValues = {
    name: '  Tuition  ',
    category: 'tuition',
    priorityLevel: 'first',
    active: true,
    code: ' TUI ',
    description: ' Main tuition ',
  };

  it('builds create/edit payload without hidden backend flags', () => {
    const payload = buildFinanceServiceFormPayload(baseValues);
    expect(payload).toEqual({
      name: 'Tuition',
      category: 'tuition',
      allocation_priority_level: 'first',
      active: true,
      code: 'TUI',
      description: 'Main tuition',
    });
    expect(payload).not.toHaveProperty('requires_subscription');
    expect(payload).not.toHaveProperty('requires_usage_tracking');
  });

  it('preserves backend-only flags by omitting them on edit saves', () => {
    const payload = buildFinanceServiceFormPayload({
      ...baseValues,
      name: 'Updated tuition',
      priorityLevel: 'last',
    });
    expect(payload.name).toBe('Updated tuition');
    expect(payload.allocation_priority_level).toBe('last');
    expect(Object.keys(payload)).not.toContain('requires_subscription');
    expect(Object.keys(payload)).not.toContain('requires_usage_tracking');
  });
});
