import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function messages(locale: 'ar' | 'fr' | 'en' | 'es') {
  return JSON.parse(read(`messages/${locale}.json`)) as {
    nav: Record<string, string>;
  };
}

describe('Finance sidebar workspace contract', () => {
  const nav = read('src/components/navigation/nav-config.ts');

  it('expands finance into seven intent-based destinations', () => {
    expect(nav).toContain("labelKey: 'nav.financeCommandCenter'");
    expect(nav).toContain("labelKey: 'nav.financeCollectionsCash'");
    expect(nav).toContain("labelKey: 'nav.financeArrearsFollowup'");
    expect(nav).toContain("labelKey: 'nav.financeInstallmentsAccounts'");
    expect(nav).toContain("labelKey: 'nav.financeCheques'");
    expect(nav).toContain("labelKey: 'nav.financeReports'");
    expect(nav).toContain("labelKey: 'nav.financeSetup'");

    expect(nav).toContain("href: '/admin/finance/command-center'");
    expect(nav).toContain("'/admin/finance/collections'");
    expect(nav).toContain("href: '/admin/finance/arrears'");
    expect(nav).toContain("'/admin/finance/installments'");
    expect(nav).toContain("href: '/admin/finance/cheques'");
    expect(nav).toContain("href: '/admin/finance/reports/collections'");
    expect(nav).toContain("'/admin/finance/fee-plans'");
  });

  it('groups related finance routes under the same operational destination', () => {
    expect(nav).toContain("pathname.startsWith('/admin/finance/cash-desk')");
    expect(nav).toContain("pathname.startsWith('/admin/finance/receipts')");
    expect(nav).toContain("pathname.startsWith('/admin/finance/billing-accounts')");
    expect(nav).toContain("pathname.startsWith('/admin/finance/credit-balances')");
    expect(nav).toContain("pathname.startsWith('/admin/finance/fee-types')");
    expect(nav).toContain("pathname.startsWith('/admin/finance/services')");
    expect(nav).toContain("pathname.startsWith('/admin/finance/agreements')");
  });

  it('keeps the finance group RBAC-driven instead of exposing every destination blindly', () => {
    expect(nav).toContain('canViewPayments(user)');
    expect(nav).toContain('canViewCashSessions(user)');
    expect(nav).toContain('canViewStudentBalance(user)');
    expect(nav).toContain('canViewCheques(user)');
    expect(nav).toContain('canViewFinanceSetup(user)');
  });

  it('ships the workspace labels in all supported admin locales', () => {
    for (const locale of ['ar', 'fr', 'en', 'es'] as const) {
      const copy = messages(locale).nav;
      expect(copy.financeCommandCenter).toBeTruthy();
      expect(copy.financeCollectionsCash).toBeTruthy();
      expect(copy.financeArrearsFollowup).toBeTruthy();
      expect(copy.financeInstallmentsAccounts).toBeTruthy();
      expect(copy.financeCheques).toBeTruthy();
      expect(copy.financeReports).toBeTruthy();
      expect(copy.financeSetup).toBeTruthy();
    }

    const ar = messages('ar').nav;
    expect(ar.financeCommandCenter).toBe('مركز القيادة');
    expect(ar.financeCollectionsCash).toBe('التحصيل والصندوق');
    expect(ar.financeArrearsFollowup).toBe('المتأخرات والمتابعة');
    expect(ar.financeInstallmentsAccounts).toBe('الأقساط والحسابات');
    expect(ar.financeCheques).toBe('الشيكات');
    expect(ar.financeReports).toBe('التقارير المالية');
    expect(ar.financeSetup).toBe('الإعداد المالي');
  });
});
