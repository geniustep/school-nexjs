import type { SchoolRef } from '@/types/api';
import type { AdminScope } from '@/types/scope';
import type { AdminBinding, AdminKind, CurrentUser } from '@/types/user';

function uniqueSchoolIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
}

function schoolIdsFromBindings(bindings?: AdminBinding[]): number[] {
  if (!bindings?.length) return [];
  return uniqueSchoolIds(bindings.map((b) => b.school_id));
}

function schoolsFromBindings(bindings?: AdminBinding[]): SchoolRef[] {
  if (!bindings?.length) return [];
  const seen = new Set<number>();
  const out: SchoolRef[] = [];
  for (const b of bindings) {
    if (!b.school_id || seen.has(b.school_id)) continue;
    seen.add(b.school_id);
    out.push({
      id: b.school_id,
      name: b.school_name?.trim() || `School #${b.school_id}`,
    });
  }
  return out;
}

export function resolvePrimaryScope(user: Pick<CurrentUser, 'scope' | 'scopes'>): AdminScope | undefined {
  if (user.scope) return user.scope;
  const scopes = user.scopes;
  if (!scopes?.length) return undefined;
  return scopes.find((s) => s.type === 'school') ?? scopes[0];
}

export function resolveSchoolIds(user: Pick<CurrentUser, 'school_ids' | 'school' | 'bindings'>): number[] {
  if (user.school_ids?.length) return uniqueSchoolIds(user.school_ids);
  const fromBindings = schoolIdsFromBindings(user.bindings);
  if (fromBindings.length) return fromBindings;
  if (user.school?.id) return [user.school.id];
  return [];
}

export function resolveSchoolCatalog(
  user: Pick<CurrentUser, 'schools' | 'bindings' | 'school_ids' | 'school'>,
): SchoolRef[] {
  if (user.schools?.length) return user.schools;
  const fromBindings = schoolsFromBindings(user.bindings);
  if (fromBindings.length) return fromBindings;
  const ids = resolveSchoolIds(user);
  if (user.school && ids.includes(user.school.id)) {
    return ids.map((id) => (id === user.school!.id ? user.school! : { id, name: `School #${id}` }));
  }
  return ids.map((id) => ({ id, name: `School #${id}` }));
}

export function resolveActiveSchoolId(
  user: Pick<
    CurrentUser,
    'active_school_id' | 'default_school_id' | 'school_ids' | 'school' | 'bindings'
  >,
  cookieSchoolId?: number | null,
): number | null {
  const allowed = resolveSchoolIds(user);
  const fallback =
    user.active_school_id ??
    user.default_school_id ??
    user.school?.id ??
    (allowed.length === 1 ? allowed[0] : null);

  if (cookieSchoolId != null && allowed.includes(cookieSchoolId)) return cookieSchoolId;
  if (fallback != null && allowed.includes(fallback)) return fallback;
  if (allowed.length === 1) return allowed[0];
  return allowed.length ? null : fallback;
}

export function schoolRefForId(catalog: SchoolRef[], id: number | null): SchoolRef | null {
  if (id == null) return null;
  return catalog.find((s) => s.id === id) ?? { id, name: `School #${id}` };
}

export function normalizeMeUser(raw: CurrentUser): CurrentUser {
  const school_ids = resolveSchoolIds(raw);
  const schools = resolveSchoolCatalog({ ...raw, school_ids });
  const scopes = raw.scopes?.length ? raw.scopes : raw.scope ? [raw.scope] : [];
  const scope = resolvePrimaryScope({ scope: raw.scope, scopes });
  const active_school_id = resolveActiveSchoolId(raw);
  const school = schoolRefForId(schools, active_school_id) ?? raw.school ?? null;

  return {
    ...raw,
    admin_kind: raw.admin_kind as AdminKind | undefined,
    school_ids,
    schools,
    scopes,
    scope,
    active_school_id: active_school_id ?? undefined,
    school,
    permissions: raw.permissions ?? [],
  };
}
