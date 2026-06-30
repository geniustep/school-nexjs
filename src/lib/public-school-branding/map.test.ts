import { describe, expect, it } from 'vitest';
import { fallbackTenantBrandingView } from './map';

describe('fallbackTenantBrandingView', () => {
  it('returns tenant-level branding without inventing school_code', () => {
    const view = fallbackTenantBrandingView('alwah');
    expect(view.tenantCode).toBe('alwah');
    expect(view.schoolCode).toBe('');
    expect(view.schoolName).toBe('alwah');
    expect(view.logoAvailable).toBe(false);
    expect(view.fromApi).toBe(false);
  });
});
