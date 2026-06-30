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

// ---------------------------------------------------------------------------
// Tenant registry — host / tenantCode / backend (school context is separate)
// ---------------------------------------------------------------------------

export type TenantRuntimeConfig = {
  host: string;
  tenantCode: string;
  backendBaseUrl: string;
  active: boolean;
  isOfficial: boolean;
  /**
   * Optional only.
   * Do not assume every tenant has one school.
   * Use only for public pages when explicitly configured.
   */
  defaultPublicSchoolCode?: string;
};

export type TenantRuntimeConfigSource = 'registry' | 'fallback';

export type TenantRuntimeFailureReason =
  | 'missing_host'
  | 'invalid_domain'
  | 'nested_subdomain'
  | 'invalid_tenant_slug'
  | 'missing_fallback_db'
  | 'tenant_not_in_registry'
  | 'tenant_backend_not_configured'
  | 'tenant_inactive';

export type TenantRuntimeConfigResolution =
  | { ok: true; config: TenantRuntimeConfig; source: TenantRuntimeConfigSource }
  | { ok: false; reason: TenantRuntimeFailureReason };

type TenantRegistryEntry = {
  tenantCode: string;
  defaultPublicSchoolCode?: string;
  /** Explicit URL, or null when resolved from config.odooBaseUrl at runtime. */
  backendBaseUrl: string | null;
  useOdooBaseUrl?: boolean;
  active: boolean;
  isOfficial: boolean;
  hosts: readonly string[];
};

/** Server-only registry — extend here when onboarding new schools. */
const TENANT_REGISTRY: readonly TenantRegistryEntry[] = [
  {
    tenantCode: 'school',
    defaultPublicSchoolCode: 'school',
    backendBaseUrl: null,
    useOdooBaseUrl: true,
    active: true,
    isOfficial: false,
    hosts: ['school.raqeem.ma'],
  },
  {
    tenantCode: 'nibras',
    defaultPublicSchoolCode: 'nibras',
    backendBaseUrl: 'https://api-nibras.raqeem.ma',
    active: true,
    isOfficial: true,
    hosts: ['nibras.raqeem.ma'],
  },
  {
    tenantCode: 'alwah',
    backendBaseUrl: 'https://api-alwah.raqeem.ma',
    active: true,
    isOfficial: true,
    hosts: ['alwah.raqeem.ma'],
  },
] as const;

const REGISTRY_BY_CODE = new Map<string, TenantRegistryEntry>(
  TENANT_REGISTRY.map((entry) => [entry.tenantCode, entry]),
);

const REGISTRY_BY_HOST = new Map<string, TenantRegistryEntry>(
  TENANT_REGISTRY.flatMap((entry) => entry.hosts.map((host) => [host, entry] as const)),
);

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/** Resolve backend URL for a registry entry (exported for odoo-backend). */
export function resolveEntryBackendUrl(entry: TenantRegistryEntry): string | null {
  if (entry.useOdooBaseUrl) {
    const url = config.odooBaseUrl?.trim();
    return url ? normalizeBaseUrl(url) : null;
  }
  const explicit = entry.backendBaseUrl?.trim();
  return explicit ? normalizeBaseUrl(explicit) : null;
}

function runtimeConfigFromEntry(host: string, entry: TenantRegistryEntry): TenantRuntimeConfigResolution {
  if (!entry.active) {
    return { ok: false, reason: 'tenant_inactive' };
  }

  const backendBaseUrl = resolveEntryBackendUrl(entry);
  if (!backendBaseUrl) {
    return { ok: false, reason: 'tenant_backend_not_configured' };
  }

  const config: TenantRuntimeConfig = {
    host,
    tenantCode: entry.tenantCode,
    backendBaseUrl,
    active: entry.active,
    isOfficial: entry.isOfficial,
  };
  if (entry.defaultPublicSchoolCode) {
    config.defaultPublicSchoolCode = entry.defaultPublicSchoolCode;
  }

  return { ok: true, source: 'registry', config };
}

function fallbackRuntimeConfig(host: string, fallbackDb: string): TenantRuntimeConfigResolution {
  const backendBaseUrl = config.odooBaseUrl?.trim();
  if (!backendBaseUrl) {
    return { ok: false, reason: 'tenant_backend_not_configured' };
  }

  return {
    ok: true,
    source: 'fallback',
    config: {
      host,
      tenantCode: fallbackDb,
      defaultPublicSchoolCode: fallbackDb,
      backendBaseUrl: normalizeBaseUrl(backendBaseUrl),
      active: true,
      isOfficial: false,
    },
  };
}

/** Lookup a registry entry by tenant code (Odoo db slug). */
export function getTenantRegistryEntry(tenantCode: string): TenantRegistryEntry | undefined {
  return REGISTRY_BY_CODE.get(tenantCode.trim().toLowerCase());
}

/**
 * Resolve full tenant runtime config from a normalized hostname.
 * Production hosts use the registry; localhost / preview use ODOO_DB + ODOO_BASE_URL.
 */
export function resolveTenantRuntimeConfigFromHost(
  host: string | null,
  rootDomain: string = config.tenantRootDomain,
  fallbackDb: string = config.odooDb,
): TenantRuntimeConfigResolution {
  if (!host) return { ok: false, reason: 'missing_host' };

  if (isFallbackHost(host)) {
    if (!fallbackDb) return { ok: false, reason: 'missing_fallback_db' };
    return fallbackRuntimeConfig(host, fallbackDb);
  }

  const byHost = REGISTRY_BY_HOST.get(host);
  if (byHost) return runtimeConfigFromEntry(host, byHost);

  const tenantResolution = resolveTenantFromHost(host, rootDomain, fallbackDb);
  if (!tenantResolution.ok) {
    const reasonMap: Record<string, TenantRuntimeFailureReason> = {
      invalid_domain: 'invalid_domain',
      nested_subdomain: 'nested_subdomain',
      invalid_tenant_slug: 'invalid_tenant_slug',
      missing_fallback_db: 'missing_fallback_db',
    };
    return {
      ok: false,
      reason: reasonMap[tenantResolution.reason] ?? 'tenant_not_in_registry',
    };
  }

  const byCode = REGISTRY_BY_CODE.get(tenantResolution.tenant);
  if (!byCode) return { ok: false, reason: 'tenant_not_in_registry' };

  return runtimeConfigFromEntry(host, byCode);
}

export function resolveTenantRuntimeConfigFromRequest(request: Request): TenantRuntimeConfigResolution {
  const host = getHostFromHeaders(request.headers);
  return resolveTenantRuntimeConfigFromHost(host);
}

/** Resolve tenant runtime config during RSC / route handlers without a Request object. */
export async function resolveTenantRuntimeConfigFromServerHeaders(): Promise<TenantRuntimeConfigResolution> {
  const { headers } = await import('next/headers');
  const hdrs = await headers();
  const host = getHostFromHeaders(hdrs);
  return resolveTenantRuntimeConfigFromHost(host);
}
