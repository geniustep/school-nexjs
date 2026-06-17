import { describe, expect, it } from 'vitest';
import { feePlanErrorMessageKey } from '@/features/admin/finance/fee-plans/fee-plan-errors';
import { resolveFeePlanLifecycleErrorCode } from '@/features/admin/finance/fee-plans/normalize-fee-plan';

describe('fee plan lifecycle error mapping', () => {
  it('maps reset forbidden error to translation key', () => {
    expect(feePlanErrorMessageKey('fee_plan_reset_forbidden_in_use')).toBe(
      'admin.finance.feePlansWorkspace.lifecycleErrors.fee_plan_reset_forbidden_in_use',
    );
  });

  it('maps delete in use error', () => {
    expect(feePlanErrorMessageKey('fee_plan_in_use')).toBe(
      'admin.finance.feePlansWorkspace.lifecycleErrors.fee_plan_in_use',
    );
  });

  it('resolves lifecycle codes', () => {
    expect(resolveFeePlanLifecycleErrorCode('fee_plan_delete_forbidden_state')).toBe(
      'fee_plan_delete_forbidden_state',
    );
    expect(resolveFeePlanLifecycleErrorCode('unknown')).toBeNull();
  });
});

describe('fee plan lifecycle BFF paths', () => {
  it('exposes lifecycle endpoints under admin finance fee plans', async () => {
    const { endpoints } = await import('@/lib/api/endpoints');
    expect(endpoints.admin.financeFeePlanResetToDraft(12)).toBe(
      '/admin/finance/fee-plans/12/reset-to-draft',
    );
    expect(endpoints.admin.financeFeePlanDuplicate(12)).toBe('/admin/finance/fee-plans/12/duplicate');
    expect(endpoints.admin.financeFeePlanRestore(12)).toBe('/admin/finance/fee-plans/12/restore');
    expect(endpoints.admin.financeFeePlan(12)).toBe('/admin/finance/fee-plans/12');
  });
});
