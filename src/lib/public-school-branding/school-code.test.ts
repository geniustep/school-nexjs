import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/config', () => ({
  config: {
    odooBaseUrl: 'https://default-odoo.example',
    odooDb: 'school',
    tenantRootDomain: 'raqeem.ma',
  },
}));

vi.mock('@/lib/login-school-brand', () => ({
  resolveLoginSchoolCode: () => 'raqeem',
}));

import {
  resolvePublicSchoolCodeFromRequest,
  resolvePublicTenantCodeFromRequest,
} from './school-code';

describe('resolvePublicSchoolCodeFromRequest', () => {
  it('uses school_code query when provided', () => {
    const request = new Request('https://alwah.raqeem.ma/api/public?school_code=custom-school', {
      headers: { host: 'alwah.raqeem.ma' },
    });
    expect(resolvePublicSchoolCodeFromRequest(request)).toBe('custom-school');
  });

  it('uses defaultPublicSchoolCode for nibras single-school tenant', () => {
    const request = new Request('https://nibras.raqeem.ma/login', {
      headers: { host: 'nibras.raqeem.ma' },
    });
    expect(resolvePublicTenantCodeFromRequest(request)).toBe('nibras');
    expect(resolvePublicSchoolCodeFromRequest(request)).toBe('nibras');
  });

  it('does not invent school_code for alwah without query or default', () => {
    const request = new Request('https://alwah.raqeem.ma/login', {
      headers: { host: 'alwah.raqeem.ma' },
    });
    expect(resolvePublicTenantCodeFromRequest(request)).toBe('alwah');
    expect(resolvePublicSchoolCodeFromRequest(request)).toBeNull();
  });

  it('passes explicit school_code query through for alwah', () => {
    const request = new Request('https://alwah.raqeem.ma/login?school_code=alwah-school', {
      headers: { host: 'alwah.raqeem.ma' },
    });
    expect(resolvePublicSchoolCodeFromRequest(request)).toBe('alwah-school');
  });

  it('uses fallback defaultPublicSchoolCode on localhost dev host', () => {
    const request = new Request('http://localhost:3000/login', {
      headers: { host: 'localhost:3000' },
    });
    expect(resolvePublicSchoolCodeFromRequest(request)).toBe('school');
  });
});
