import { describe, expect, it } from 'vitest';
import { resolveAgreementContextLabel } from './collection-agreement-label';

describe('resolveAgreementContextLabel', () => {
  it('uses the agreement name when present', () => {
    const result = resolveAgreementContextLabel(
      { id: 1070, name: 'FA/2026/00225' },
      { mode: 'active_agreement', has_active_agreement: true },
    );
    expect(result).toEqual({ kind: 'name', value: 'FA/2026/00225' });
  });

  it('falls back to #id when the agreement has no name', () => {
    const result = resolveAgreementContextLabel({ id: 1070 }, null);
    expect(result).toEqual({ kind: 'id', value: '#1070' });
  });

  it('signals an active agreement (no dash) when context says so but no record is loaded', () => {
    const result = resolveAgreementContextLabel(null, {
      mode: 'active_agreement',
      has_active_agreement: true,
    });
    expect(result.kind).toBe('active');
    expect(result.value).toBeNull();
  });

  it('signals "none" so callers show a clear message instead of "-"', () => {
    const result = resolveAgreementContextLabel(null, {
      mode: 'operational_fees',
      has_active_agreement: false,
    });
    expect(result.kind).toBe('none');
    expect(result.value).toBeNull();
  });

  it('treats missing billing context as no active agreement', () => {
    const result = resolveAgreementContextLabel(null, null);
    expect(result.kind).toBe('none');
  });
});
