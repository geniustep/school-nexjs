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

  it('maps alwah host to its registry default public school code (ecole-alwah)', () => {
    const request = new Request('https://alwah.raqeem.ma/login', {
      headers: { host: 'alwah.raqeem.ma' },
    });
    expect(resolvePublicTenantCodeFromRequest(request)).toBe('alwah');
    expect(resolvePublicSchoolCodeFromRequest(request)).toBe('ecole-alwah');
  });

  it('does not equate alwah tenant code with school_code=alwah', () => {
    const request = new Request('https://alwah.raqeem.ma/login', {
      headers: { host: 'alwah.raqeem.ma' },
    });
    const tenantCode = resolvePublicTenantCodeFromRequest(request);
    const schoolCode = resolvePublicSchoolCodeFromRequest(request);
    expect(tenantCode).toBe('alwah');
    expect(schoolCode).not.toBe('alwah');
    expect(schoolCode).toBe('ecole-alwah');
  });

  it('passes explicit school_code query through for alwah', () => {
    const request = new Request('https://alwah.raqeem.ma/login?school_code=alwah-school', {
      headers: { host: 'alwah.raqeem.ma' },
    });
    expect(resolvePublicSchoolCodeFromRequest(request)).toBe('alwah-school');
  });

  it('maps ahlen host to ahlen tenant and school code', () => {
    const request = new Request('https://ahlen.raqeem.ma/login', {
      headers: { host: 'ahlen.raqeem.ma' },
    });
    expect(resolvePublicTenantCodeFromRequest(request)).toBe('ahlen');
    expect(resolvePublicSchoolCodeFromRequest(request)).toBe('ahlen');
  });

  it('uses fallback defaultPublicSchoolCode on localhost dev host', () => {
    const request = new Request('http://localhost:3000/login', {
      headers: { host: 'localhost:3000' },
    });
    expect(resolvePublicSchoolCodeFromRequest(request)).toBe('school');
  });
});
