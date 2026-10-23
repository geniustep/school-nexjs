import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(resolve(path), 'utf8');
const family = read('src/features/admin/finance/family-collection-workflow-form.tsx');
const core = read('src/features/admin/finance/quick-payment-core-fields.tsx');
const gate = read('src/features/admin/finance/cash-desk/collection-cash-session-gate.tsx');
describe('family drawer refinements', () => {
  it('uses one additional-details section with journal in primary position', () => {
    expect(family).toContain('hideDrawerAdditionalDetails');
    expect(core).toContain('hideDrawerAdditionalDetails ? null : drawerDetails');
    expect(family).toContain('drawerJournalPlacement="primary"');
  });
  it('hides redundant text without bypassing cash-session gate', () => {
    expect(family).not.toContain('studentScopedEntry');
    expect(family).not.toContain('student360Context');
    expect(family).not.toContain('actualPayerHint');
    expect(gate).toContain('if (!access.shared || hideSharedSuccessNotice) return null;');
    expect(family).toContain('CollectionCashSessionGate');
  });
  it('makes payer conditional and keeps actual payer contract', () => {
    expect(family).toContain('checked={differentPayer}');
    expect(family).toContain('actualPayerIdentity');
    expect(family).toContain('payload.actual_payer_name = trimmedPayer');
  });
  it('preserves preview and confirm constraints', () => {
    expect(family).toContain('context.total_remaining');
    expect(family).toContain('context.total_overdue');
    expect(family).toContain('context.credit_balance');
    expect(family).toContain('fetchFamilyCollectionBackendPreview');
    expect(family).toContain('confirmFamilyCollection');
    expect(family).toContain('unallocatedRequiresAllocation');
  });
  it('supports existing manual editor plus presets', () => {
    expect(family).toContain("setAmountPreset('overdue')");
    expect(family).toContain("setAmountPreset('all')");
    expect(family).toContain("setAmountPreset('custom')");
    expect(family).toContain('FamilyCollectionManualEditor');
  });
  it('has translations for all locales', () => {
    for (const loc of ['ar','fr','en','es']) {
      const v = JSON.parse(read('messages/'+loc+'.json')).admin.finance.billingAccounts.familyCollection;
      for (const key of ["balanceRemainingLabel","balanceOverdueLabel","collectibleNowLabel","creditAvailableLabel","amountCustomLabel","actualPayerToggle","actualPayerIdentity","allocationReceivedLabel","allocationDistributedLabel","allocationUndistributedLabel","allocationIndicativeHint"]) expect(typeof v[key]).toBe('string');
    }
  });
});