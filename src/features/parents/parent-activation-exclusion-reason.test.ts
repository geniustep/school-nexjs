import { describe, expect, it, vi } from 'vitest';
import { getParentActivationExclusionLabel } from './parent-activation-exclusion-reason';

describe('parent activation exclusion reason labels', () => {
  it('renders the new legal-status contract reasons without calling t with an undefined key', () => {
    const t = vi.fn((key: string) => `translated:${key}`);

    expect(getParentActivationExclusionLabel('ar', t, 'legal_status_unknown')).toBe('الصفة القانونية غير محددة');
    expect(getParentActivationExclusionLabel('ar', t, 'not_legal_guardian')).toBe('ليس وليًا قانونيًا');
    expect(getParentActivationExclusionLabel('ar', t, 'account_blocked')).toBe('حساب رقيم محظور');
    expect(t).not.toHaveBeenCalled();
  });

  it('keeps existing i18n-backed reasons working', () => {
    const t = vi.fn((key: string) => `translated:${key}`);

    expect(getParentActivationExclusionLabel('ar', t, 'identity_unavailable')).toBe(
      'translated:admin.parentActivation.reason.identityUnavailable',
    );
    expect(t).toHaveBeenCalledWith('admin.parentActivation.reason.identityUnavailable');
  });

  it('fails safely when Odoo adds an unknown reason code', () => {
    const t = vi.fn((key: string) => `translated:${key}`);

    expect(getParentActivationExclusionLabel('ar', t, 'future_reason_code')).toBe('سبب الاستبعاد غير معروف');
    expect(t).not.toHaveBeenCalled();
  });
});
