// Server-only tenant resolution from the incoming request Host header.
// Maps <tenant>.raqeem.ma → Odoo database name; localhost / Vercel preview → ODOO_DB.

import 'server-only';

import { config } from '@/lib/config';

/** Valid tenant slug: lowercase letters, digits, hyphens; single label only. */
const TENANT_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export type TenantResolution =
  | { ok: true; tenant: string; source: 'subdomain' | 'fallback' }
  | { ok: false; reason: string };

/** Normalize a raw host value: first entry, no port, lowercase, no trailing dot. */
export function normalizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(',')[0].trim();
  const withoutPort = first.includes(':') ? first.split(':')[0] : first;
  return withoutPort.toLowerCase().replace(/\.$/, '');
}

/** Read host from x-forwarded-host, then host. */
export function getHostFromHeaders(hdrs: Headers): string | null {
  const forwarded = hdrs.get('x-forwarded-host');
  if (forwarded) return normalizeHost(forwarded);
  return normalizeHost(hdrs.get('host'));
}

/** Private LAN IPv4 (192.168/16) — dev-only for mobile testing over local network. */
const DEV_LAN_IPV4_RE = /^192\.168(?:\.\d{1,3}){2}$/;

/** True when host is a normalized 192.168.x.x address (no port). */
export function isDevLanHost(host: string): boolean {
  return DEV_LAN_IPV4_RE.test(host);
}

/** Hosts that use ODOO_DB instead of subdomain extraction. */
export function isFallbackHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  if (process.env.NODE_ENV === 'development' && isDevLanHost(host)) return true;
  return false;
}

export function isValidTenantSlug(slug: string): boolean {
  return TENANT_SLUG_RE.test(slug);
}

/**
 * Resolve Odoo database name from a normalized hostname.
 * Production *.raqeem.ma uses subdomain; dev/preview uses ODOO_DB fallback.
 */
export function resolveTenantFromHost(
  host: string | null,
  rootDomain: string = config.tenantRootDomain,
  fallbackDb: string = config.odooDb,
): TenantResolution {
  if (!host) return { ok: false, reason: 'missing_host' };

  if (isFallbackHost(host)) {
    if (!fallbackDb) return { ok: false, reason: 'missing_fallback_db' };
    return { ok: true, tenant: fallbackDb, source: 'fallback' };
  }

  const suffix = `.${rootDomain}`;
  if (!host.endsWith(suffix) || host === rootDomain) {
    return { ok: false, reason: 'invalid_domain' };
  }

  const label = host.slice(0, -suffix.length);

  if (label.includes('.')) {
    return { ok: false, reason: 'nested_subdomain' };
  }

  if (label === 'www' || !isValidTenantSlug(label)) {
    return { ok: false, reason: 'invalid_tenant_slug' };
  }

  return { ok: true, tenant: label, source: 'subdomain' };
}

export function resolveTenantFromRequest(request: Request): TenantResolution {
  const host = getHostFromHeaders(request.headers);
  return resolveTenantFromHost(host);
}

/** Resolve tenant during RSC / route handlers without a Request object. */
export async function resolveTenantFromServerHeaders(): Promise<TenantResolution> {
  const { headers } = await import('next/headers');
  const hdrs = await headers();
  const host = getHostFromHeaders(hdrs);
  return resolveTenantFromHost(host);
}

/** Compare stored tenant cookie with the tenant implied by the current host. */
export function tenantSessionMatches(
  storedTenant: string | null | undefined,
  resolved: TenantResolution,
): boolean {
  if (!resolved.ok || !storedTenant) return false;
  return storedTenant === resolved.tenant;
}
