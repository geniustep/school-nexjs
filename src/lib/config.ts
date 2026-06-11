// Server-only runtime configuration. Never import this from a client component.

export const config = {
  /** Base URL of the Odoo backend (no trailing slash). */
  odooBaseUrl: (process.env.ODOO_BASE_URL ?? 'http://localhost:8069').replace(/\/$/, ''),
  /** Odoo database fallback for localhost / Vercel preview only (not *.raqeem.ma). */
  odooDb: process.env.ODOO_DB ?? 'alwah',
  /** Root domain for tenant subdomain extraction, e.g. raqeem.ma → alwah.raqeem.ma. */
  tenantRootDomain: process.env.TENANT_ROOT_DOMAIN ?? 'raqeem.ma',
  /** API v1 prefix. Frozen — see API_REPORT.md. */
  apiPrefix: '/api/v1',
  /** httpOnly cookie that stores the Odoo session id on the Next.js side. */
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'scc_session',
  /** httpOnly cookie binding the session to the resolved tenant (Odoo db). */
  tenantCookieName: process.env.TENANT_COOKIE_NAME ?? 'scc_tenant',
  activeSchoolCookieName: process.env.ACTIVE_SCHOOL_COOKIE_NAME ?? 'scc_active_school',
  /** Odoo's own session cookie name. */
  odooSessionCookieName: 'session_id',
};

export function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** httpOnly session cookie Secure flag — false on localhost even in production builds. */
export function cookieSecure(): boolean {
  if (process.env.COOKIE_SECURE === 'false') return false;
  if (!isProd()) return false;
  try {
    const host = new URL(config.odooBaseUrl).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return false;
  } catch {
    /* ignore malformed URL */
  }
  return true;
}
