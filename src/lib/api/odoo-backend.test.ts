import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_BASE = 'https://default-odoo.example';

vi.mock('@/lib/config', () => ({
  config: {
    odooBaseUrl: DEFAULT_BASE,
    odooDb: 'school',
    tenantRootDomain: 'raqeem.ma',
    tenantCookieName: 'scc_tenant',
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('resolveOdooBaseUrlForTenant', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.TENANT_ODOO_URL_NIBRAS;
    delete process.env.TENANT_ODOO_URL_SCHOOL;
  });

  afterEach(() => {
    delete process.env.TENANT_ODOO_URL_NIBRAS;
    delete process.env.TENANT_ODOO_URL_SCHOOL;
  });

  async function load() {
    return import('./odoo-backend');
  }

  it('uses registry api-nibras for nibras without TENANT_ODOO_URL_NIBRAS', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(resolveOdooBaseUrlForTenant('nibras')).toEqual({
      ok: true,
      baseUrl: 'https://api-nibras.raqeem.ma',
    });
  });

  it('uses explicit ODOO_BASE_URL mapping for school tenant', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(resolveOdooBaseUrlForTenant('school')).toEqual({
      ok: true,
      baseUrl: DEFAULT_BASE,
    });
  });

  it('uses registry api-alwah for alwah tenant', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(resolveOdooBaseUrlForTenant('alwah')).toEqual({
      ok: true,
      baseUrl: 'https://api-alwah.raqeem.ma',
    });
  });

  it('uses registry api-ahlen for ahlen tenant', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(resolveOdooBaseUrlForTenant('ahlen')).toEqual({
      ok: true,
      baseUrl: 'https://api-ahlen.raqeem.ma',
    });
  });

  it('fails closed for unknown tenant instead of ODOO_BASE_URL fallback', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(resolveOdooBaseUrlForTenant('unknown-tenant')).toEqual({
      ok: false,
      code: 'TENANT_BACKEND_NOT_CONFIGURED',
    });
  });

  it('does not use ODOO_BASE_URL for nibras when registry mapping exists', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    const result = resolveOdooBaseUrlForTenant('nibras');
    expect(result).toEqual({ ok: true, baseUrl: 'https://api-nibras.raqeem.ma' });
    if (result.ok) {
      expect(result.baseUrl).not.toBe(DEFAULT_BASE);
    }
  });

  it('uses ODOO_BASE_URL on fallback host even for official tenant slug', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(
      resolveOdooBaseUrlForTenant('nibras', { host: 'localhost' }),
    ).toEqual({ ok: true, baseUrl: DEFAULT_BASE });
  });

  it('still allows env override as secondary to registry', async () => {
    process.env.TENANT_ODOO_URL_NIBRAS = 'https://env-override.example/';
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(resolveOdooBaseUrlForTenant('nibras')).toEqual({
      ok: true,
      baseUrl: 'https://env-override.example',
    });
  });

  it('builds env key from tenant slug with hyphens', async () => {
    const { tenantOdooUrlEnvKey } = await load();
    expect(tenantOdooUrlEnvKey('my-school')).toBe('TENANT_ODOO_URL_MY_SCHOOL');
  });

  it('returns an object envelope, not a string URL (prevents [object Object] regressions)', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    const result = resolveOdooBaseUrlForTenant('nibras');
    expect(typeof result).toBe('object');
    expect(`${result}`).toContain('[object Object]');
    if (result.ok) {
      expect(typeof result.baseUrl).toBe('string');
      expect(result.baseUrl).toMatch(/^https:\/\//);
      expect(`${result.baseUrl}/web/image/x`).not.toContain('[object Object]');
    }
  });
});

describe('tenantBackendNotConfiguredResponse', () => {
  it('returns 503 with TENANT_BACKEND_NOT_CONFIGURED', async () => {
    const { tenantBackendNotConfiguredResponse } = await import('./odoo-backend');
    const res = tenantBackendNotConfiguredResponse();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe('TENANT_BACKEND_NOT_CONFIGURED');
  });
});
