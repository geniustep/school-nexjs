import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const LOCALES = ['ar', 'en', 'fr', 'es'] as const;

const CREDIT_BALANCE_KEYS = [
  'creditBalanceSummaryTitle',
  'amountPaid',
  'allocatedToInstallments',
  'resultingCreditBalance',
  'creditBalanceLabel',
  'creditBalanceNotReducingDuesWarning',
  'unallocatedBecomesCreditNotice',
  'fullCreditBalanceNotice',
  'previewRemainingCurrent',
  'manualAllocationToggle',
  'manualAllocationHint',
  'autoAllocationHint',
] as const;

const COLLECTIONS_KEYS = ['openReceipt', 'activeAgreement', 'noActiveAgreement'] as const;

function loadMessages(locale: string): Record<string, unknown> {
  const file = resolve(process.cwd(), 'messages', `${locale}.json`);
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
}

describe('credit balance i18n keys', () => {
  for (const locale of LOCALES) {
    it(`defines all credit balance keys for ${locale}`, () => {
      const messages = loadMessages(locale);
      const workflow = (messages as any)?.admin?.finance?.collectionWorkflow as
        | Record<string, unknown>
        | undefined;
      expect(workflow, `collectionWorkflow missing in ${locale}`).toBeTruthy();
      for (const key of CREDIT_BALANCE_KEYS) {
        const value = workflow?.[key];
        expect(typeof value, `${locale}.collectionWorkflow.${key}`).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    });
  }
});

describe('collection context i18n keys', () => {
  for (const locale of LOCALES) {
    it(`defines collection context keys (incl. openReceipt) for ${locale}`, () => {
      const messages = loadMessages(locale);
      const collections = (messages as any)?.admin?.finance?.collections as
        | Record<string, unknown>
        | undefined;
      expect(collections, `admin.finance.collections missing in ${locale}`).toBeTruthy();
      for (const key of COLLECTIONS_KEYS) {
        const value = collections?.[key];
        expect(typeof value, `${locale}.collections.${key}`).toBe('string');
        expect((value as string).trim().length).toBeGreaterThan(0);
      }
    });
  }
});
