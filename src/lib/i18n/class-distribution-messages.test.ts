import { describe, expect, it } from 'vitest';
import { translateClassDistributionMessage } from './class-distribution-messages';

describe('class distribution messages', () => {
  it('provides the feature entry label in all supported locales', () => {
    for (const locale of ['ar', 'en', 'fr', 'es'] as const) {
      expect(translateClassDistributionMessage(locale, 'admin.classDistribution.entry')).toBeTruthy();
    }
  });

  it('interpolates parameters', () => {
    expect(
      translateClassDistributionMessage('ar', 'admin.classDistribution.selectedCount', { count: 3 }),
    ).toContain('3');
  });

  it('returns undefined outside the feature message namespace', () => {
    expect(translateClassDistributionMessage('ar', 'common.save')).toBeUndefined();
  });
});
