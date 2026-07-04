// Executive director dashboard UX — variant detection and layout helpers.
// Does not change API contracts.

import { resolveDashboardVariant, type AdminDashboardVariantId } from '@/lib/admin/dashboard-registry';
import { shouldUsePedagogicalDashboard } from '@/lib/admin/pedagogical-dashboard';
import type { CurrentUser } from '@/types/user';

export const EXECUTIVE_DIRECTOR_VARIANTS = [
  'project_manager',
  'school_manager',
  'legacy_admin',
] as const satisfies readonly AdminDashboardVariantId[];

export function isExecutiveDirectorVariantId(id: AdminDashboardVariantId): boolean {
  return (EXECUTIVE_DIRECTOR_VARIANTS as readonly string[]).includes(id);
}

export function isExecutiveDirectorUser(user: CurrentUser | null): boolean {
  if (!user || shouldUsePedagogicalDashboard(user)) return false;
  const variant = resolveDashboardVariant(user);
  return variant.shell === 'command' && isExecutiveDirectorVariantId(variant.id);
}

/** Technical context panel — hidden for wide executive roles (they get the executive header). */
export function shouldShowDashboardContextPanel(user: CurrentUser | null): boolean {
  if (!user) return false;
  if (shouldUsePedagogicalDashboard(user)) return false;
  const variant = resolveDashboardVariant(user);
  if (variant.shell === 'readonly') return true;
  if (!variant.canAccess || variant.shell !== 'command') return false;
  return !isExecutiveDirectorVariantId(variant.id);
}

export function isExecutiveDashboardPending(state: {
  loading: boolean;
  data: unknown;
  error: unknown;
}): boolean {
  return state.loading && state.data == null && state.error == null;
}

export function isExecutiveDashboardFailed(state: {
  loading: boolean;
  data: unknown;
  error: unknown;
}): boolean {
  return !state.loading && state.data == null && state.error != null;
}

export function shouldIncludeLegacyImportantAlerts(options: {
  executiveLayout: boolean;
  executivePending: boolean;
  executiveAvailable: boolean;
}): boolean {
  if (!options.executiveLayout) return true;
  return !options.executivePending && !options.executiveAvailable;
}
