import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readBillingAccountKindFromSearchParams } from '@/features/admin/finance/billing-account-kind';

const LOCALES = ['ar', 'en', 'fr', 'es'] as const;
const FAMILY_COLLECTION_KEYS = [
  'intro',
  'autoAllocationHint',
  'limitToStudent',
  'confirmAction',
  'student360Context',
  'switchToFamilyAllocation',
  'familyWideAllocationHint',
] as const;

const formSource = readFileSync(
  resolve('src/features/admin/finance/family-collection-workflow-form.tsx'),
  'utf8',
);
const hubLinksSource = readFileSync(resolve('src/features/admin/finance/finance-hub-links.tsx'), 'utf8');

describe('finance hub billing accounts deep link', () => {
  it('uses family account_kind on billing accounts hub card', () => {
    expect(hubLinksSource).toContain("href: '/admin/finance/billing-accounts?account_kind=family'");
    expect(hubLinksSource).toContain("labelKey: 'admin.finance.billingAccounts.hubTitle'");
  });

  it('defaults absent account_kind query to all', () => {
    expect(readBillingAccountKindFromSearchParams(new URLSearchParams())).toBe('all');
    expect(readBillingAccountKindFromSearchParams(new URLSearchParams('page=2'))).toBe('all');
  });
});

describe('family collection workflow form structure', () => {
  it('renders familyCollection intro in primary flow', () => {
    expect(formSource).toContain("t('admin.finance.billingAccounts.familyCollection.intro')");
  });

  it('keeps allocation options outside advanced details', () => {
    const allocationIdx = formSource.indexOf('finance-family-collection-allocation-options');
    const advancedIdx = formSource.indexOf('finance-collection-advanced');
    expect(allocationIdx).toBeGreaterThan(-1);
    expect(advancedIdx).toBeGreaterThan(allocationIdx);
    expect(formSource).not.toMatch(
      /finance-collection-advanced[\s\S]*finance-family-collection-allocation-options/,
    );
  });

  it('does not duplicate accountName in form body (drawer subtitle owns account context)', () => {
    expect(formSource).not.toMatch(/\{accountName\}/);
  });

  it('shows autoAllocationHint when automatic allocation is active', () => {
    expect(formSource).toContain('!limitToStudent ? (');
    expect(formSource).toContain("t('admin.finance.billingAccounts.familyCollection.autoAllocationHint')");
  });

  it('clears student selection and stale preview when disabling limitToStudent', () => {
    expect(formSource).toMatch(/if \(!e\.target\.checked\) setSelectedStudentId\(''\)/);
    const toggleHandler = formSource.slice(
      formSource.indexOf('finance-family-collection-allocation-options'),
      formSource.indexOf('finance-collection-advanced'),
    );
    expect(toggleHandler).toContain('setPreview(null)');
    expect(toggleHandler).toContain('setPreviewError(null)');
  });

  it('keeps student selector inside allocation section when limitToStudent is enabled', () => {
    const allocationSection = formSource.slice(
      formSource.indexOf('finance-family-collection-allocation-options'),
      formSource.indexOf('finance-collection-advanced'),
    );
    expect(allocationSection).toContain('limitToStudent ? (');
    expect(allocationSection).toContain("t('admin.finance.billingAccounts.familyCollection.selectStudent')");
  });
});

describe('family collection i18n keys', () => {
  for (const locale of LOCALES) {
    it(`defines required familyCollection keys for ${locale}`, () => {
      const messages = JSON.parse(readFileSync(resolve(`messages/${locale}.json`), 'utf8')) as {
        admin?: { finance?: { billingAccounts?: { familyCollection?: Record<string, string> } } };
      };
      const familyCollection = messages.admin?.finance?.billingAccounts?.familyCollection;
      expect(familyCollection, `familyCollection missing in ${locale}`).toBeTruthy();
      for (const key of FAMILY_COLLECTION_KEYS) {
        const value = familyCollection?.[key];
        expect(typeof value, `${locale}.familyCollection.${key}`).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    });
  }
});
