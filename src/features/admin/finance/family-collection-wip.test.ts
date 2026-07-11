import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readBillingAccountKindFromSearchParams } from '@/features/admin/finance/billing-account-kind';

const LOCALES = ['ar', 'en', 'fr', 'es'] as const;
const FAMILY_COLLECTION_KEYS = [
  'intro',
  'manualAllocationHint',
  'saveDraftAction',
  'reviewAction',
  'confirmAction',
  'student360Context',
  'reviewTitle',
  'unallocatedNotice',
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
  it('renders familyCollection header summary in primary flow', () => {
    expect(formSource).toContain("t('admin.finance.billingAccounts.familyCollection.headerSummaryTitle')");
    expect(formSource).toContain('finance-family-collection-header-summary');
  });

  it('keeps smart summary before advanced details', () => {
    const summaryIdx = formSource.indexOf('FamilyCollectionSmartSummary');
    const advancedIdx = formSource.indexOf('finance-collection-advanced');
    expect(summaryIdx).toBeGreaterThan(-1);
    expect(advancedIdx).toBeGreaterThan(summaryIdx);
  });

  it('shows account context and payer summary in form body', () => {
    expect(formSource).toContain("t('admin.finance.payer')");
    expect(formSource).toContain('accountName?.trim()');
  });

  it('uses smart summary and direct confirmation', () => {
    expect(formSource).toContain('FamilyCollectionSmartSummary');
    expect(formSource).toContain('confirmFamilyCollection');
    expect(formSource).toContain('FamilyCollectionReviewStep');
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
