import type { SchoolRef } from '@/types/api';
import type { AdminScope } from '@/types/scope';
import type {
  ActiveUserContext,
  AdminBinding,
  AdminKind,
  CurrentUser,
  Role,
  UserRoleContext,
} from '@/types/user';

const ROLE_SET = new Set<Role>(['admin', 'teacher', 'parent', 'student']);

function asRole(value: unknown): Role | null {
  if (typeof value !== 'string') return null;
  const role = value.trim().toLowerCase() as Role;
  return ROLE_SET.has(role) ? role : null;
}

function asActiveContext(value: unknown): ActiveUserContext | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as { school_id?: unknown; role?: unknown };
  const schoolId = Number(item.school_id);
  const role = asRole(item.role);
  if (!Number.isInteger(schoolId) || schoolId <= 0 || !role) return null;
  return { school_id: schoolId, role };
}

function asAvailableContexts(value: unknown): UserRoleContext[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const contexts: UserRoleContext[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;
    const schoolId = Number(item.school_id);
    const role = asRole(item.role);
    if (!Number.isInteger(schoolId) || schoolId <= 0 || !role) continue;
    const key = `${schoolId}:${role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    contexts.push({
      school_id: schoolId,
      school_name: typeof item.school_name === 'string' ? item.school_name : null,
      role,
      source: typeof item.source === 'string' ? item.source : null,
      bindings:
        item.bindings && typeof item.bindings === 'object'
          ? (item.bindings as UserRoleContext['bindings'])
          : undefined,
    });
  }
  return contexts;
}

function uniqueSchoolIds(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
}

/** Odoo may return bindings as an array or a keyed object — normalize to array. */
function asBindingList(bindings: unknown): AdminBinding[] {
  if (!bindings) return [];
  if (Array.isArray(bindings)) return bindings;
  if (typeof bindings === 'object') {
    return Object.values(bindings).filter(
      (b): b is AdminBinding =>
        !!b && typeof b === 'object' && typeof (b as AdminBinding).school_id === 'number',
    );
  }
  return [];
}

/** Odoo may return schools as an array or a keyed object — normalize to array. */
function asSchoolList(schools: unknown): SchoolRef[] {
  if (!schools) return [];
  if (Array.isArray(schools)) return schools;
  if (typeof schools === 'object') {
    return Object.values(schools).filter(
      (s): s is SchoolRef => !!s && typeof s === 'object' && typeof (s as SchoolRef).id === 'number',
    );
  }
  return [];
}

function schoolIdsFromBindings(bindings?: AdminBinding[] | unknown): number[] {
  const list = asBindingList(bindings);
  if (!list.length) return [];
  return uniqueSchoolIds(list.map((b) => b.school_id));
}

function schoolNameFromSources(
  user: Pick<CurrentUser, 'schools' | 'bindings' | 'school'>,
  schoolId: number,
): string {
  const fromSchools = asSchoolList(user.schools)
    .find((s) => s.id === schoolId)
    ?.name?.trim();
  if (fromSchools && !/^School #\d+$/.test(fromSchools)) return fromSchools;

  const fromBinding = asBindingList(user.bindings)
    .find((b) => b.school_id === schoolId)
    ?.school_name?.trim();
  if (fromBinding) return fromBinding;

  if (user.school?.id === schoolId) {
    const n = user.school.name?.trim();
    if (n && !/^School #\d+$/.test(n)) return n;
  }

  return '';
}

function schoolsFromBindings(bindings?: AdminBinding[] | unknown): SchoolRef[] {
  const list = asBindingList(bindings);
  if (!list.length) return [];
  const seen = new Set<number>();
  const out: SchoolRef[] = [];
  for (const b of list) {
    if (!b.school_id || seen.has(b.school_id)) continue;
    seen.add(b.school_id);
    out.push({
      id: b.school_id,
      name: b.school_name?.trim() || '',
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

export function resolveSchoolIds(
  user: Pick<CurrentUser, 'school_ids' | 'school' | 'bindings' | 'schools'>,
): number[] {
  const fromSchools = uniqueSchoolIds(asSchoolList(user.schools).map((s) => s.id));
  if (fromSchools.length) return fromSchools;
  if (user.school_ids?.length) return uniqueSchoolIds(user.school_ids);
  const fromBindings = schoolIdsFromBindings(user.bindings);
  if (fromBindings.length) return fromBindings;
  if (user.school?.id) return [user.school.id];
  return [];
}

/** Admin school list for switcher/labels — prefers `/me` schools[], then fallbacks. */
export function resolveSchoolCatalog(
  user: Pick<CurrentUser, 'schools' | 'bindings' | 'school_ids' | 'school'>,
): SchoolRef[] {
  const schoolList = asSchoolList(user.schools);
  const allowedIds = resolveSchoolIds(user);

  if (schoolList.length) {
    const byId = new Map(schoolList.map((s) => [s.id, s]));
    const ids = allowedIds.length ? allowedIds : [...byId.keys()];
    return ids.map((id) => {
      const entry = byId.get(id);
      const apiName = entry?.name?.trim();
      if (apiName && hasResolvedSchoolName(apiName)) {
        return { id, name: apiName };
      }
      return { id, name: schoolNameFromSources(user, id) };
    });
  }

  const fromBindings = schoolsFromBindings(user.bindings);
  if (fromBindings.length) return fromBindings;

  return allowedIds.map((id) => ({
    id,
    name: schoolNameFromSources(user, id),
  }));
}

function hasResolvedSchoolName(name: string | null | undefined): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return false;
  return !/^School #\d+$/.test(trimmed);
}

function firstAllowedSchoolId(allowed: number[]): number | null {
  return allowed.length > 0 ? allowed[0] : null;
}

/** Pick active school: valid cookie → default → /me active → school ref → first allowed. */
export function resolveActiveSchoolId(
  user: Pick<
    CurrentUser,
    'active_school_id' | 'default_school_id' | 'school_ids' | 'school' | 'bindings' | 'schools'
  >,
  cookieSchoolId?: number | null,
): number | null {
  const allowed = resolveSchoolIds(user);
  if (!allowed.length) return null;

  if (cookieSchoolId != null && allowed.includes(cookieSchoolId)) return cookieSchoolId;

  const candidates = [
    user.default_school_id,
    user.active_school_id,
    user.school?.id,
  ];
  for (const id of candidates) {
    if (id != null && allowed.includes(id)) return id;
  }

  if (allowed.length === 1) return allowed[0];
  return firstAllowedSchoolId(allowed);
}

export function schoolRefForId(catalog: SchoolRef[], id: number | null): SchoolRef | null {
  if (id == null) return null;
  return catalog.find((s) => s.id === id) ?? { id, name: '' };
}

export function normalizeMeUser(raw: CurrentUser): CurrentUser {
  const active_context = asActiveContext(raw.active_context);
  const available_contexts = asAvailableContexts(raw.available_contexts);
  const bindings = asBindingList(raw.bindings);
  const schoolsFromMe = asSchoolList(raw.schools);
  const base = {
    ...raw,
    bindings: bindings.length ? bindings : undefined,
    schools: schoolsFromMe.length ? schoolsFromMe : undefined,
  };
  const school_ids = resolveSchoolIds(base);
  const schools = resolveSchoolCatalog({ ...base, school_ids });
  const scopes = raw.scopes?.length ? raw.scopes : raw.scope ? [raw.scope] : [];
  const scope = resolvePrimaryScope({ scope: raw.scope, scopes });
  const legacyActiveSchoolId = resolveActiveSchoolId({ ...base, school_ids });
  const active_school_id = active_context?.role === 'admin'
    ? active_context.school_id
    : active_context
      ? undefined
      : legacyActiveSchoolId ?? undefined;
  const contextSchool = active_context
    ? available_contexts?.find(
        (ctx) => ctx.school_id === active_context.school_id && ctx.role === active_context.role,
      )
    : undefined;
  const school = active_context
    ? {
        id: active_context.school_id,
        name:
          contextSchool?.school_name?.trim() ||
          (raw.school?.id === active_context.school_id ? raw.school.name : '') ||
          '',
      }
    : schoolRefForId(schools, legacyActiveSchoolId) ??
      (raw.school?.id != null ? schoolRefForId(schools, raw.school.id) : null) ??
      raw.school ??
      null;

  const teacher_id =
    typeof raw.teacher_id === 'number' && raw.teacher_id > 0 ? raw.teacher_id : undefined;

  return {
    ...base,
    admin_kind: raw.admin_kind as AdminKind | undefined,
    teacher_id,
    is_teacher: raw.is_teacher === true ? true : raw.is_teacher === false ? false : undefined,
    creation_template_code:
      typeof raw.creation_template_code === 'string' ? raw.creation_template_code : undefined,
    roles: Array.isArray(raw.roles) ? raw.roles.filter((r): r is string => typeof r === 'string') : raw.roles,
    active_role: typeof raw.active_role === 'string' ? raw.active_role : undefined,
    active_context,
    available_contexts,
    available_roles: Array.isArray(raw.available_roles)
      ? raw.available_roles.filter(
          (r): r is import('@/types/user').UserRoleOption =>
            !!r && typeof r === 'object' && typeof (r as import('@/types/user').UserRoleOption).code === 'string',
        )
      : undefined,
    permissions_mode: raw.permissions_mode,
    capabilities_editable: raw.capabilities_editable,
    effective_permissions: raw.effective_permissions,
    effective_capabilities: Array.isArray(raw.effective_capabilities)
      ? raw.effective_capabilities.filter((c): c is string => typeof c === 'string')
      : undefined,
    school_access_suspended:
      (raw as { school_access_suspended?: unknown }).school_access_suspended === true
        ? true
        : undefined,
    school_ids,
    schools,
    scopes,
    scope,
    active_school_id,
    school,
    permissions: raw.permissions ?? [],
  };
}
