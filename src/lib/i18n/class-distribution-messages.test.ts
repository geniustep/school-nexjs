import { describe, expect, it } from 'vitest';
import { translateClassDistributionMessage } from './class-distribution-messages';

const REQUIRED_V2_KEYS = [
  'admin.classDistribution.entry',
  'admin.classDistribution.subtitle',
  'admin.classDistribution.moveTo',
  'admin.classDistribution.multipleSources',
  'admin.classDistribution.previewAction',
  'admin.classDistribution.confirmAction',
  'admin.classDistribution.moreStudents',
  'admin.classDistribution.error.batchTooLarge',
  'admin.classDistribution.error.invalidMove',
] as const;

describe('class distribution messages', () => {
  it('provides required Workspace V2 labels in all supported locales', () => {
    for (const locale of ['ar', 'en', 'fr', 'es'] as const) {
      for (const key of REQUIRED_V2_KEYS) {
        expect(translateClassDistributionMessage(locale, key)).toBeTruthy();
      }
    }
  });

  it('interpolates parameters', () => {
    expect(
      translateClassDistributionMessage('ar', 'admin.classDistribution.selectedCount', { count: 3 }),
    ).toContain('3');
    expect(
      translateClassDistributionMessage('ar', 'admin.classDistribution.moreStudents', { count: 15 }),
    ).toContain('15');
  });

  it('uses the approved Arabic redistribution subtitle', () => {
    expect(translateClassDistributionMessage('ar', 'admin.classDistribution.subtitle')).toBe(
      'إعادة توزيع التلاميذ بين الأقسام أو تركهم بدون قسم',
    );
  });

  it('returns undefined outside the feature message namespace', () => {
    expect(translateClassDistributionMessage('ar', 'common.save')).toBeUndefined();
  });
});
