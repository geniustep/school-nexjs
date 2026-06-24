import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_BASE = 'https://default-odoo.example';

vi.mock('@/lib/config', () => ({
  config: {
    odooBaseUrl: DEFAULT_BASE,
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

  it('uses TENANT_ODOO_URL_NIBRAS for nibras tenant', async () => {
    process.env.TENANT_ODOO_URL_NIBRAS = 'https://api-nibras.raqeem.ma/';
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(resolveOdooBaseUrlForTenant('nibras')).toBe('https://api-nibras.raqeem.ma');
  });

  it('falls back to ODOO_BASE_URL for school when no override', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(resolveOdooBaseUrlForTenant('school')).toBe(DEFAULT_BASE);
  });

  it('falls back to ODOO_BASE_URL when TENANT_ODOO_URL_NIBRAS is unset', async () => {
    const { resolveOdooBaseUrlForTenant } = await load();
    expect(resolveOdooBaseUrlForTenant('nibras')).toBe(DEFAULT_BASE);
  });

  it('builds env key from tenant slug with hyphens', async () => {
    const { tenantOdooUrlEnvKey } = await load();
    expect(tenantOdooUrlEnvKey('my-school')).toBe('TENANT_ODOO_URL_MY_SCHOOL');
  });
});
