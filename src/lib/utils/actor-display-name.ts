function normalizeActorSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

const SYSTEM_ACTOR_SLUGS = new Set(['system', 'odoo', 'auto', 'automation']);
const MANAGER_ACTOR_SLUGS = new Set(['odoobot', 'odoo_bot']);

export type ActorDisplayKind = 'manager' | 'system' | 'user';

export function isOdooAutomationActor(name: string | null | undefined): boolean {
  if (!name?.trim()) return false;
  const slug = normalizeActorSlug(name);
  return MANAGER_ACTOR_SLUGS.has(slug) || /^odoo\s*bot$/i.test(name.trim());
}

/** Map backend automation actors to safe UI labels — never expose Odoo branding. */
export function classifyActorDisplayName(name: string | null | undefined): {
  kind: ActorDisplayKind;
  displayName: string | null;
} {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return { kind: 'user', displayName: null };

  const slug = normalizeActorSlug(trimmed);
  if (MANAGER_ACTOR_SLUGS.has(slug) || /^odoo\s*bot$/i.test(trimmed)) {
    return { kind: 'manager', displayName: null };
  }
  if (SYSTEM_ACTOR_SLUGS.has(slug)) {
    return { kind: 'system', displayName: null };
  }

  return { kind: 'user', displayName: trimmed };
}

export const FINANCE_PERFORMED_BY_MANAGER_KEY =
  'admin.student360.financeWorkspace.agreementContext.performedByManager';
export const FINANCE_PERFORMED_BY_SYSTEM_KEY =
  'admin.student360.financeWorkspace.agreementContext.performedBySystem';
export const FINANCE_PERFORMED_BY_USER_KEY =
  'admin.student360.financeWorkspace.agreementContext.performedByUser';
export const FINANCE_PERFORMED_BY_UNAVAILABLE_KEY =
  'admin.student360.financeWorkspace.agreementContext.performedByUnavailable';
