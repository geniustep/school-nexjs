import type {
  GuardianAllowedActions,
  GuardianRemovalImpact,
  GuardianRemovalImpactAction,
} from '@/types/student-360';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return list.length ? list : undefined;
}

function normalizeSuggestedActions(raw: unknown): GuardianRemovalImpactAction[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .map((item): GuardianRemovalImpactAction | null => {
      const record = asRecord(item);
      if (!record || typeof record.label !== 'string') return null;
      return {
        label: record.label,
        href: typeof record.href === 'string' ? record.href : undefined,
        action: typeof record.action === 'string' ? record.action : undefined,
      };
    })
    .filter((item): item is GuardianRemovalImpactAction => item != null);
  return items.length ? items : undefined;
}

export function normalizeAllowedActionsFromRaw(raw: unknown): GuardianAllowedActions | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const actions: GuardianAllowedActions = {};
  if (typeof record.remove_guardian_relationship === 'boolean') {
    actions.remove_guardian_relationship = record.remove_guardian_relationship;
  }
  if (typeof record.remove_relationship === 'boolean') {
    actions.remove_guardian_relationship = record.remove_relationship;
  }
  if (typeof record.end_relationship === 'boolean') {
    actions.end_relationship = record.end_relationship;
  }
  if (typeof record.edit_relationship === 'boolean') {
    actions.edit_relationship = record.edit_relationship;
  }
  if (typeof record.manage_account === 'boolean') {
    actions.manage_account = record.manage_account;
  }
  if (typeof record.archive_guardian_profile === 'boolean') {
    actions.archive_guardian_profile = record.archive_guardian_profile;
  }
  return Object.keys(actions).length ? actions : undefined;
}

export function normalizeRemovalImpactFromRaw(data: unknown): GuardianRemovalImpact | null {
  const raw = asRecord(data);
  if (!raw) return null;
  const summary = readStringList(raw.summary) ?? readStringList(raw.items);
  const otherRoles = readStringList(raw.other_roles) ?? readStringList(raw.role_labels);
  return {
    can_remove:
      typeof raw.can_remove === 'boolean' ? raw.can_remove : raw.blocked === true ? false : undefined,
    blocked: raw.blocked === true,
    blocker_code: typeof raw.blocker_code === 'string' ? raw.blocker_code : undefined,
    blocker_message: typeof raw.blocker_message === 'string' ? raw.blocker_message : undefined,
    suggested_actions: normalizeSuggestedActions(raw.suggested_actions),
    summary,
    items: summary,
    other_children_count:
      typeof raw.other_children_count === 'number' ? raw.other_children_count : undefined,
    other_roles: otherRoles,
    role_labels: otherRoles,
    account_preserved: raw.account_preserved === true || undefined,
    professional_profile_preserved: raw.professional_profile_preserved === true || undefined,
    professional_roles: readStringList(raw.professional_roles),
    removes_primary_contact: raw.removes_primary_contact === true || undefined,
    removes_financial_responsible: raw.removes_financial_responsible === true || undefined,
    removes_legal_guardian: raw.removes_legal_guardian === true || undefined,
    removes_emergency_contact: raw.removes_emergency_contact === true || undefined,
    billing_party_change:
      typeof raw.billing_party_change === 'string'
        ? raw.billing_party_change
        : raw.billing_party_change === null
          ? null
          : undefined,
    has_user_account: raw.has_user_account === true || undefined,
    needs_new_account:
      typeof raw.needs_new_account === 'boolean' ? raw.needs_new_account : undefined,
  };
}

export function impactSummaryLines(impact: GuardianRemovalImpact | null | undefined): string[] {
  if (!impact) return [];
  if (impact.summary?.length) return impact.summary;
  if (impact.items?.length) return impact.items;
  return [];
}

export function isRemovalBlocked(impact: GuardianRemovalImpact | null | undefined): boolean {
  if (!impact) return false;
  if (impact.blocked === true) return true;
  if (impact.can_remove === false) return true;
  return false;
}
