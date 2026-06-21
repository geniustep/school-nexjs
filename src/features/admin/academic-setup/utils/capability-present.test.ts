import { describe, expect, it } from 'vitest';
import { resolveCapabilityLabel } from './capability-present';

describe('resolveCapabilityLabel', () => {
  it('translates admission capability codes via i18n map', () => {
    expect(
      resolveCapabilityLabel('ar', { code: 'admission.create', label: 'create' }),
    ).toBe('إنشاء');
  });

  it('translates finance social discount code', () => {
    expect(
      resolveCapabilityLabel('ar', {
        code: 'finance.apply_social_discount',
        label: 'Finance — Apply Social Discount',
      }),
    ).toBe('تطبيق خصم اجتماعي');
  });
});
