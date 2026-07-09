import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeCollectionPriorityLevel } from '@/features/admin/finance/finance-service-priority';

const formSource = readFileSync(
  resolve('src/features/admin/finance/finance-service-form.tsx'),
  'utf8',
);
const panelSource = readFileSync(
  resolve('src/features/admin/finance/services-tariffs-panel.tsx'),
  'utf8',
);
const pageSource = readFileSync(resolve('src/app/admin/finance/services/page.tsx'), 'utf8');
const workflowSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-workflow-form.tsx'),
  'utf8',
);

describe('finance service catalog simplification', () => {
  it('shows collection priority selector with first, normal, last', () => {
    expect(formSource).toContain('COLLECTION_ALLOCATION_PRIORITY_LEVELS');
    expect(formSource).toContain('allocation_priority_level');
    expect(formSource).toContain('admin.finance.services.priority.${level}');
  });

  it('labels category as service type in the form', () => {
    expect(formSource).toContain("t('admin.finance.services.columns.serviceType')");
    expect(formSource).not.toContain("t('admin.finance.services.columns.category')");
  });

  it('hides tariffs tab from the services page UI', () => {
    expect(panelSource).not.toContain('finance-hub-tabs');
    expect(panelSource).not.toContain("t('admin.finance.services.tabs.tariffs')");
    expect(pageSource).not.toContain('ServicesTariffsTab');
    expect(pageSource).not.toContain('addTariff');
  });

  it('shows collection priority in the services table', () => {
    expect(panelSource).toContain('FinanceServicePriorityBadge');
    expect(panelSource).toContain("t('admin.finance.services.columns.collectionPriority')");
  });

  it('keeps code and description in advanced settings only', () => {
    expect(formSource).toContain('finance-collection-advanced');
    expect(formSource).toContain("t('admin.finance.services.advancedSettings')");
    const advancedBlock = formSource.slice(formSource.indexOf('finance-collection-advanced'));
    expect(advancedBlock).toContain("t('admin.finance.services.columns.code')");
    expect(advancedBlock).toContain("t('common.description')");
  });

  it('maps priority levels to backend contract values', () => {
    expect(normalizeCollectionPriorityLevel('first')).toBe('first');
    expect(normalizeCollectionPriorityLevel('normal')).toBe('normal');
    expect(normalizeCollectionPriorityLevel('last')).toBe('last');
    expect(normalizeCollectionPriorityLevel(undefined)).toBe('normal');
  });
});

describe('family collection suggestion UX', () => {
  it('uses explicit suggest action without auto-allocation on load', () => {
    expect(workflowSource).toContain('buildSuggestedFamilyAllocations');
    expect(workflowSource).toContain('suggestAllocationAction');
    expect(workflowSource).toContain('function applySuggestedAllocation');
    expect(workflowSource).not.toContain('buildSuggestedFamilyAllocations(context');
  });

  it('shows policy-based explainability without hardcoded registration-first text', () => {
    expect(workflowSource).toContain('suggestionExplainability');
    expect(workflowSource).not.toContain('registration');
    expect(workflowSource).not.toContain('التسجيل أولًا');
  });
});
