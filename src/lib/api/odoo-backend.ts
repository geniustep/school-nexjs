// Server-only Odoo backend URL resolution per tenant slug (from hostname / session cookie).
// Browser code must never import this file.

import 'server-only';

import { cookies } from 'next/headers';
import { config } from '@/lib/config';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/** Env key for a tenant-specific Odoo base URL, e.g. TENANT_ODOO_URL_NIBRAS. */
export function tenantOdooUrlEnvKey(tenant: string): string {
  return `TENANT_ODOO_URL_${tenant.trim().toUpperCase().replace(/-/g, '_')}`;
}

/**
 * Resolve the Odoo base URL for a tenant slug.
 * Host-derived tenant only — never accept URL from request body.
 */
export function resolveOdooBaseUrlForTenant(tenant: string): string {
  const slug = tenant.trim().toLowerCase();
  if (!slug) return config.odooBaseUrl;

  const override = process.env[tenantOdooUrlEnvKey(slug)]?.trim();
  if (override) return normalizeBaseUrl(override);

  return config.odooBaseUrl;
}

/** Read the bound tenant slug from the httpOnly session cookie (if any). */
export async function getStoredTenantSlug(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(config.tenantCookieName)?.value?.trim();
  return value && value.length > 0 ? value : null;
}
