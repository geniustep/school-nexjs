import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const read=(file:string)=>readFileSync(resolve(file),'utf8');
const workflow=read('src/features/admin/finance/collection-workflow-form.tsx');
const card=read('src/features/admin/finance/collection-prepayment-summary-card.tsx');
const picker=read('src/features/admin/finance/monthly-installment-picker.tsx');
describe('single student collection drawer UX', () => {
  it('removes verbose amount hint and allowed shared-session notice from drawer', () => {
    expect(workflow).toContain("flexiblePrepaymentFlow && !directDrawerFlow");
    expect(workflow).toContain('hideSharedSuccessNotice={directDrawerFlow}');
    expect(workflow).toContain('CollectionCashSessionGate');
  });
  it('shows student identity, financial agreement and remaining amount', () => {
    expect(card).toContain('collection-prepayment-summary__identity');
    expect(card).toContain('collection-prepayment-summary__student');
    expect(card).toContain('resolveCollectionGateBlocked');
    expect(card).toContain('FinanceMoney amount={summary?.remaining}');
  });
  it('shows proposed monthly progress without creating a payment', () => {
    expect(workflow).toContain('deriveStudentMonthlyAllocation');
    expect(picker).toContain('calculateMonthPaymentProgress');
    expect(picker).toContain('role="progressbar"');
    expect(picker).toContain('monthlyProgressProposed');
  });
  it('preserves backend preview, permission validation and manual allocations', () => {
    expect(workflow).toContain('previewPaymentCollection');
    expect(workflow).toContain('isCollectionPreviewStale');
    expect(workflow).toContain('handleMonthlyAllocationChange');
  });
});
