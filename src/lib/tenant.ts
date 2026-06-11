import 'server-only';

import { config } from '@/lib/config';

const TENANT_PATTERN = /^[a-z0-9][a-z0-9]{0,62}$/;

function normalizeHost(value: string | null): string {
  if (!value) return '';
  const first = value.split(',')[0]?.trim().toLowerCase() ?? '';
  return first.replace(/:\d+$/, '').replace(/\.$/, '');
}

/**
 * Resolve the Odoo database for a request.
 *
 * - <tenant>.raqeem.ma -> <tenant>
 * - localhost, Vercel preview URLs and legacy hosts -> ODOO_DB fallback
 *
 * Tenant labels intentionally allow only lowercase ASCII letters and digits so
 * they can be passed to Odoo as database names without transformation.
 */
export function resolveTenantDatabase(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = normalizeHost(forwardedHost || request.headers.get('host'));
  const suffix = `.${config.tenantRootDomain}`;

  if (!host.endsWith(suffix)) {
    return config.odooDb;
  }

  const tenant = host.slice(0, -suffix.length);

  // Only one subdomain label is supported: alwah.raqeem.ma, not x.alwah.raqeem.ma.
  if (!tenant || tenant.includes('.') || !TENANT_PATTERN.test(tenant)) {
    throw new Error('invalid_tenant_host');
  }

  return tenant;
}
