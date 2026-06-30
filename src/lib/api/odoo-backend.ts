// Server-only Odoo backend URL resolution per tenant (registry-first, fail-closed).
// Browser code must never import this file.

import 'server-only';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import {
  getTenantRegistryEntry,
  isFallbackHost,
  normalizeHost,
  resolveEntryBackendUrl,
  type TenantRuntimeConfig,
} from '@/lib/tenant';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

export type BackendBaseUrlResolution =
  | { ok: true; baseUrl: string }
  | { ok: false; code: 'TENANT_BACKEND_NOT_CONFIGURED' };

/** Env key for optional tenant-specific override (secondary to registry). */
export function tenantOdooUrlEnvKey(tenant: string): string {
  return `TENANT_ODOO_URL_${tenant.trim().toUpperCase().replace(/-/g, '_')}`;
}

type BackendResolveOptions = {
  /** When set, fallback hosts always use ODOO_BASE_URL (dev / preview). */
  host?: string | null;
};

/**
 * Resolve the Odoo base URL for a tenant code.
 * Official tenants without explicit mapping never fall back to ODOO_BASE_URL.
 */
export function resolveOdooBaseUrlForTenant(
  tenant: string,
  opts?: BackendResolveOptions,
): BackendBaseUrlResolution {
  const slug = tenant.trim().toLowerCase();
  if (!slug) return { ok: false, code: 'TENANT_BACKEND_NOT_CONFIGURED' };

  const host = opts?.host ? normalizeHost(opts.host) : null;
  if (host && isFallbackHost(host)) {
    const fallbackUrl = config.odooBaseUrl?.trim();
    if (!fallbackUrl) return { ok: false, code: 'TENANT_BACKEND_NOT_CONFIGURED' };
    return { ok: true, baseUrl: normalizeBaseUrl(fallbackUrl) };
  }

  const envOverride = process.env[tenantOdooUrlEnvKey(slug)]?.trim();
  if (envOverride) return { ok: true, baseUrl: normalizeBaseUrl(envOverride) };

  const entry = getTenantRegistryEntry(slug);
  if (!entry) return { ok: false, code: 'TENANT_BACKEND_NOT_CONFIGURED' };

  const url = resolveEntryBackendUrl(entry);
  if (!url) return { ok: false, code: 'TENANT_BACKEND_NOT_CONFIGURED' };

  return { ok: true, baseUrl: url };
}

/** Resolve backend URL from a fully resolved tenant runtime config. */
export function resolveOdooBaseUrlFromRuntimeConfig(
  runtime: TenantRuntimeConfig,
): BackendBaseUrlResolution {
  const url = runtime.backendBaseUrl?.trim();
  if (!url) return { ok: false, code: 'TENANT_BACKEND_NOT_CONFIGURED' };
  return { ok: true, baseUrl: normalizeBaseUrl(url) };
}

export function tenantBackendNotConfiguredResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'TENANT_BACKEND_NOT_CONFIGURED',
        message: 'Tenant backend is not configured.',
        details: {},
      },
      meta: {},
    },
    { status: 503 },
  );
}

/** Read the bound tenant slug from the httpOnly session cookie (if any). */
export async function getStoredTenantSlug(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(config.tenantCookieName)?.value?.trim();
  return value && value.length > 0 ? value : null;
}
