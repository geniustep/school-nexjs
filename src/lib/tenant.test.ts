import { afterEach, describe, expect, it, vi } from 'vitest';
import { tenantDisplayName } from '@/lib/tenant-public';

vi.mock('@/lib/config', () => ({
  config: {
    odooBaseUrl: 'https://default-odoo.example',
    odooDb: 'school',
    tenantRootDomain: 'raqeem.ma',
  },
}));

import {
  getHostFromHeaders,
  isDevLanHost,
  isFallbackHost,
  isValidTenantSlug,
  normalizeHost,
  resolveEntryBackendUrl,
  resolveTenantFromHost,
  resolveTenantRuntimeConfigFromHost,
  resolveTenantRuntimeConfigFromRequest,
  tenantSessionMatches,
} from './tenant';

const ROOT = 'raqeem.ma';
const FALLBACK = 'school';

function hostHeaders(host: string): Headers {
  return new Headers({ host });
}

describe('normalizeHost', () => {
  it('takes first host from a comma-separated list', () => {
    expect(normalizeHost('alwah.raqeem.ma, proxy.internal')).toBe('alwah.raqeem.ma');
  });

  it('strips port, lowercases, and trailing dot', () => {
    expect(normalizeHost('Alwah.Raqeem.Ma.:3000.')).toBe('alwah.raqeem.ma');
  });
});

describe('resolveTenantFromHost', () => {
  it('maps school subdomains to Odoo database names', () => {
    for (const [host, db] of [
      ['alwah.raqeem.ma', 'alwah'],
      ['nibras.raqeem.ma', 'nibras'],
      ['school.raqeem.ma', 'school'],
    ]) {
      const result = resolveTenantFromHost(host, ROOT, FALLBACK);
      expect(result).toEqual({ ok: true, tenant: db, source: 'subdomain' });
    }
  });

  it('uses ODOO_DB fallback for local and Vercel preview hosts', () => {
    for (const host of ['localhost', '127.0.0.1', 'my-app-preview.vercel.app']) {
      const result = resolveTenantFromHost(host, ROOT, FALLBACK);
      expect(result).toEqual({ ok: true, tenant: FALLBACK, source: 'fallback' });
    }
  });

  it('resolves localhost with port via normalizeHost + fallback', () => {
    const host = normalizeHost('localhost:3000');
    expect(host).toBe('localhost');
    expect(resolveTenantFromHost(host, ROOT, FALLBACK)).toEqual({
      ok: true,
      tenant: FALLBACK,
      source: 'fallback',
    });
  });

  it('rejects apex, www, nested, and invalid tenant labels', () => {
    const rejected = [
      'raqeem.ma',
      'www.raqeem.ma',
      'x.alwah.raqeem.ma',
      'alwah_.raqeem.ma',
      '-alwah.raqeem.ma',
      'alwah-.raqeem.ma',
    ];
    for (const host of rejected) {
      expect(resolveTenantFromHost(host, ROOT, FALLBACK).ok).toBe(false);
    }
  });
});

describe('getHostFromHeaders', () => {
  it('prefers x-forwarded-host over host', () => {
    const hdrs = new Headers({
      'x-forwarded-host': 'nibras.raqeem.ma',
      host: 'localhost:3000',
    });
    expect(getHostFromHeaders(hdrs)).toBe('nibras.raqeem.ma');
  });

  it('falls back to host when x-forwarded-host is absent', () => {
    expect(getHostFromHeaders(hostHeaders('school.raqeem.ma'))).toBe('school.raqeem.ma');
  });
});

describe('isValidTenantSlug', () => {
  it('accepts single-label slugs', () => {
    expect(isValidTenantSlug('alwah')).toBe(true);
    expect(isValidTenantSlug('school-1')).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(isValidTenantSlug('alwah_')).toBe(false);
    expect(isValidTenantSlug('-alwah')).toBe(false);
    expect(isValidTenantSlug('alwah-')).toBe(false);
  });
});

describe('isDevLanHost', () => {
  it('matches 192.168.x.x IPv4 addresses', () => {
    expect(isDevLanHost('192.168.0.191')).toBe(true);
    expect(isDevLanHost('192.168.1.1')).toBe(true);
    expect(isDevLanHost('10.0.0.1')).toBe(false);
    expect(isDevLanHost('localhost')).toBe(false);
  });
});

describe('isFallbackHost', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('detects preview and local hosts', () => {
    expect(isFallbackHost('localhost')).toBe(true);
    expect(isFallbackHost('127.0.0.1')).toBe(true);
    expect(isFallbackHost('branch-preview.vercel.app')).toBe(true);
    expect(isFallbackHost('alwah.raqeem.ma')).toBe(false);
  });

  it('accepts 192.168.x.x only when NODE_ENV=development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isFallbackHost('192.168.0.191')).toBe(true);
    expect(resolveTenantFromHost('192.168.0.191', ROOT, FALLBACK)).toEqual({
      ok: true,
      tenant: FALLBACK,
      source: 'fallback',
    });
  });

  it('rejects 192.168.x.x outside development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(isFallbackHost('192.168.0.191')).toBe(false);
    expect(resolveTenantFromHost('192.168.0.191', ROOT, FALLBACK).ok).toBe(false);
  });

  it('resolves LAN host with port via normalizeHost + dev fallback', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const host = normalizeHost('192.168.0.191:3000');
    expect(host).toBe('192.168.0.191');
    expect(resolveTenantFromHost(host, ROOT, FALLBACK)).toEqual({
      ok: true,
      tenant: FALLBACK,
      source: 'fallback',
    });
  });
});

describe('tenantSessionMatches', () => {
  it('rejects cross-tenant session reuse', () => {
    const nibras = resolveTenantFromHost('nibras.raqeem.ma', ROOT, FALLBACK);
    expect(tenantSessionMatches('alwah', nibras)).toBe(false);
  });

  it('accepts matching tenant', () => {
    const alwah = resolveTenantFromHost('alwah.raqeem.ma', ROOT, FALLBACK);
    expect(tenantSessionMatches('alwah', alwah)).toBe(true);
  });
});

describe('tenantDisplayName', () => {
  it('defaults to the tenant slug', () => {
    expect(tenantDisplayName('school')).toBe('school');
  });
});

const MOCK_ODOO_BASE = 'https://default-odoo.example';

describe('resolveTenantRuntimeConfigFromHost', () => {
  it('maps nibras host to api-nibras backend from registry', () => {
    const result = resolveTenantRuntimeConfigFromHost('nibras.raqeem.ma', ROOT, FALLBACK);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config).toMatchObject({
      host: 'nibras.raqeem.ma',
      tenantCode: 'nibras',
      defaultPublicSchoolCode: 'nibras',
      backendBaseUrl: 'https://api-nibras.raqeem.ma',
      active: true,
      isOfficial: true,
    });
    expect(result.config).not.toHaveProperty('schoolCode');
    expect(result.source).toBe('registry');
  });

  it('maps school host to explicit ODOO_BASE_URL backend', () => {
    const result = resolveTenantRuntimeConfigFromHost('school.raqeem.ma', ROOT, FALLBACK);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.backendBaseUrl).toBe(MOCK_ODOO_BASE);
    expect(result.config.tenantCode).toBe('school');
    expect(result.config.isOfficial).toBe(false);
  });

  it('maps alwah tenant to its Odoo public school code (ecole-alwah)', () => {
    const result = resolveTenantRuntimeConfigFromHost('alwah.raqeem.ma', ROOT, FALLBACK);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.tenantCode).toBe('alwah');
    expect(result.config.backendBaseUrl).toBe('https://api-alwah.raqeem.ma');
    expect(result.config.defaultPublicSchoolCode).toBe('ecole-alwah');
    expect(result.config).not.toHaveProperty('schoolCode');
  });

  it('uses fallback config for localhost without registry official backend', () => {
    const result = resolveTenantRuntimeConfigFromHost('localhost', ROOT, FALLBACK);
    expect(result).toEqual({
      ok: true,
      source: 'fallback',
      config: {
        host: 'localhost',
        tenantCode: FALLBACK,
        defaultPublicSchoolCode: FALLBACK,
        backendBaseUrl: MOCK_ODOO_BASE,
        active: true,
        isOfficial: false,
      },
    });
  });

  it('fails closed when official entry has no backend URL', () => {
    const url = resolveEntryBackendUrl({
      tenantCode: 'test-official',
      backendBaseUrl: null,
      active: true,
      isOfficial: true,
      hosts: [],
    });
    expect(url).toBeNull();
  });

  it('rejects unknown production subdomain not in registry', () => {
    const result = resolveTenantRuntimeConfigFromHost('newschool.raqeem.ma', ROOT, FALLBACK);
    expect(result).toEqual({ ok: false, reason: 'tenant_not_in_registry' });
  });
});

describe('resolveTenantRuntimeConfigFromRequest', () => {
  it('maps nibras host to api-nibras backend for login/proxy routes', () => {
    const request = new Request('https://nibras.raqeem.ma/api/auth/login', {
      headers: { host: 'nibras.raqeem.ma' },
    });
    const result = resolveTenantRuntimeConfigFromRequest(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.backendBaseUrl).toBe('https://api-nibras.raqeem.ma');
    expect(result.config.tenantCode).toBe('nibras');
  });

  it('maps alwah host to api-alwah backend with ecole-alwah public school code', () => {
    const request = new Request('https://alwah.raqeem.ma/api/odoo/admin/students', {
      headers: { host: 'alwah.raqeem.ma' },
    });
    const result = resolveTenantRuntimeConfigFromRequest(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.backendBaseUrl).toBe('https://api-alwah.raqeem.ma');
    expect(result.config.defaultPublicSchoolCode).toBe('ecole-alwah');
  });

  it('uses localhost fallback backend for dev hosts', () => {
    const request = new Request('http://localhost:3000/api/odoo/admin/students', {
      headers: { host: 'localhost:3000' },
    });
    const result = resolveTenantRuntimeConfigFromRequest(request);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.backendBaseUrl).toBe(MOCK_ODOO_BASE);
    expect(result.source).toBe('fallback');
  });
});
