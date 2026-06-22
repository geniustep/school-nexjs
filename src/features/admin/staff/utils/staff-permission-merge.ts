import type { RolePermissionMetadata, StaffCapabilityOption, StaffEffectivePermissionsPayload, StaffMember, StaffScope } from '@/types/academic-setup';
import { filterDisplayPermissionCodes } from '@/features/admin/staff/utils/staff-center-present';
import {
  requiresCapabilityCatalogForCreate,
  shouldOmitCapabilityIds,
} from '@/features/admin/academic-setup/utils/staff-permissions-meta';

export interface StaffPermissionScopeUpdate {
  school_id?: number;
  scope_type?: string;
  level_ids?: number[];
  class_ids?: number[];
  capability_codes?: string[];
  remove_capability_codes?: string[];
}

export interface StaffPermissionMergePayload {
  capability_update_mode: 'merge';
  scopes: StaffPermissionScopeUpdate[];
}

export interface StaffPermissionSaveInput {
  isCreate: boolean;
  member: StaffMember | null;
  capabilityIds: number[];
  originalCapabilityIds: number[];
  capabilitiesTouched: boolean;
  catalog: StaffCapabilityOption[];
  catalogReady: boolean;
  permissionsMeta: RolePermissionMetadata;
}

export interface StaffPermissionSaveResult {
  mergePayload?: StaffPermissionMergePayload;
  capability_ids?: number[];
  omitCapabilities: boolean;
  blockSaveDueToCatalog: boolean;
  blockSaveMissingScope: boolean;
  capabilityChangesAttempted: boolean;
}

function uniqueCodes(codes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const code of codes) {
    const trimmed = code.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function sameCodeSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((code, index) => code === sortedB[index]);
}

export function scopeStoredCapabilityCodes(scope: StaffScope): string[] {
  return uniqueCodes(filterDisplayPermissionCodes(scope.capability_codes ?? scope.capabilities));
}

/** Read persisted capability codes — scopes first, never creation templates. */
export function resolveStoredCapabilityCodes(
  member: StaffMember,
  payload?: StaffEffectivePermissionsPayload | null,
): string[] {
  const fromScopes = uniqueCodes(
    (member.scopes ?? []).flatMap((scope) => scopeStoredCapabilityCodes(scope)),
  );
  if (fromScopes.length) return fromScopes;

  const assigned = payload?.assigned_capabilities ?? member.assigned_capabilities;
  if (assigned?.length) return uniqueCodes(filterDisplayPermissionCodes(assigned));

  const effectiveCaps = payload?.effective_capabilities ?? member.effective_capabilities;
  if (effectiveCaps?.length) return uniqueCodes(filterDisplayPermissionCodes(effectiveCaps));

  const effectivePerms = payload?.effective_permissions ?? member.effective_permissions;
  if (effectivePerms?.length) return uniqueCodes(filterDisplayPermissionCodes(effectivePerms));

  const legacy = member.capabilities?.length ? member.capabilities : (member.permissions ?? []);
  return uniqueCodes(filterDisplayPermissionCodes(legacy));
}

export function capabilityIdsToCodes(
  capabilityIds: number[],
  catalog: StaffCapabilityOption[],
): string[] {
  const byId = new Map(catalog.map((item) => [item.id, item.code]));
  return uniqueCodes(
    capabilityIds
      .map((id) => byId.get(id))
      .filter((code): code is string => typeof code === 'string' && code.length > 0),
  );
}

export function capabilityCodesToIds(
  codes: string[],
  catalog: StaffCapabilityOption[],
): number[] {
  const byCode = new Map(catalog.map((item) => [item.code, item.id]));
  const ids: number[] = [];
  for (const code of codes) {
    const id = byCode.get(code);
    if (id != null) ids.push(id);
  }
  return ids;
}

function scopeToUpdateBase(scope: StaffScope): StaffPermissionScopeUpdate {
  const update: StaffPermissionScopeUpdate = {};
  if (scope.school_id != null) update.school_id = scope.school_id;
  if (scope.scope_type) update.scope_type = scope.scope_type;
  if (scope.level_ids?.length) update.level_ids = [...scope.level_ids];
  if (scope.class_ids?.length) update.class_ids = [...scope.class_ids];
  return update;
}

export function buildScopeCapabilityUpdates(
  scopes: StaffScope[],
  added: string[],
  removed: string[],
): StaffPermissionScopeUpdate[] {
  if (!scopes.length) return [];
  if (!added.length && !removed.length) return [];

  if (scopes.length === 1) {
    const update = scopeToUpdateBase(scopes[0]);
    if (added.length) update.capability_codes = [...added];
    if (removed.length) update.remove_capability_codes = [...removed];
    return [update];
  }

  const updates = scopes.map((scope) => scopeToUpdateBase(scope));

  for (const code of removed) {
    scopes.forEach((scope, index) => {
      if (scopeStoredCapabilityCodes(scope).includes(code)) {
        const current = updates[index].remove_capability_codes ?? [];
        updates[index].remove_capability_codes = [...current, code];
      }
    });
  }

  if (added.length) {
    const primary = updates[0];
    primary.capability_codes = [...added];
  }

  return updates.filter(
    (update) =>
      (update.capability_codes?.length ?? 0) > 0 ||
      (update.remove_capability_codes?.length ?? 0) > 0,
  );
}

export function buildStaffPermissionSavePayload(
  input: StaffPermissionSaveInput,
): StaffPermissionSaveResult {
  const baseBlocked = {
    blockSaveDueToCatalog: false,
    blockSaveMissingScope: false,
    capabilityChangesAttempted: false,
  };

  if (shouldOmitCapabilityIds(input.permissionsMeta)) {
    return { ...baseBlocked, omitCapabilities: true };
  }

  if (!input.catalogReady) {
    const needsCatalog =
      input.isCreate && requiresCapabilityCatalogForCreate(input.permissionsMeta);
    return {
      ...baseBlocked,
      omitCapabilities: true,
      blockSaveDueToCatalog: needsCatalog || input.capabilitiesTouched,
      capabilityChangesAttempted: input.capabilitiesTouched,
    };
  }

  const currentCodes = capabilityIdsToCodes(input.capabilityIds, input.catalog);
  const originalCodes = capabilityIdsToCodes(input.originalCapabilityIds, input.catalog);
  const dirty =
    input.capabilitiesTouched || !sameCodeSet(currentCodes, originalCodes);

  if (input.isCreate) {
    return {
      ...baseBlocked,
      capability_ids: input.capabilityIds,
      omitCapabilities: false,
      capabilityChangesAttempted: dirty,
    };
  }

  if (!dirty) {
    return { ...baseBlocked, omitCapabilities: true };
  }

  const scopes = input.member?.scopes ?? [];
  if (!scopes.length) {
    return {
      ...baseBlocked,
      omitCapabilities: false,
      blockSaveMissingScope: true,
      capabilityChangesAttempted: true,
    };
  }

  const added = currentCodes.filter((code) => !originalCodes.includes(code));
  const removed = originalCodes.filter((code) => !currentCodes.includes(code));
  const scopeUpdates = buildScopeCapabilityUpdates(scopes, added, removed);

  if (!scopeUpdates.length) {
    return {
      ...baseBlocked,
      omitCapabilities: false,
      blockSaveMissingScope: true,
      capabilityChangesAttempted: true,
    };
  }

  return {
    ...baseBlocked,
    mergePayload: {
      capability_update_mode: 'merge',
      scopes: scopeUpdates,
    },
    omitCapabilities: false,
    capabilityChangesAttempted: true,
  };
}

export function payloadUsesRoleTemplateOnly(payload: Record<string, unknown>): boolean {
  const keys = Object.keys(payload);
  return keys.length === 1 && keys[0] === 'role_template_code';
}

export function responseIncludesCapabilityCodes(
  member: StaffMember,
  expectedCodes: string[],
): boolean {
  const stored = resolveStoredCapabilityCodes(member);
  return expectedCodes.every((code) => stored.includes(code));
}
