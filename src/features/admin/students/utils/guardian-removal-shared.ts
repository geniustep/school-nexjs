import type {
  GuardianAllowedActions,
  GuardianFinancialBlocker,
  GuardianRemovalEffects,
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

function normalizeFinancialBlockers(raw: unknown): GuardianFinancialBlocker[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const blockers = raw
    .map((item): GuardianFinancialBlocker | null => {
      const record = asRecord(item);
      if (!record || typeof record.code !== 'string') return null;
      return {
        code: record.code,
        message: typeof record.message === 'string' ? record.message : record.code,
        agreement_id: typeof record.agreement_id === 'number' ? record.agreement_id : undefined,
        agreement_name: typeof record.agreement_name === 'string' ? record.agreement_name : undefined,
        profile_id: typeof record.profile_id === 'number' ? record.profile_id : undefined,
        student_id: typeof record.student_id === 'number' ? record.student_id : undefined,
        guardian_id: typeof record.guardian_id === 'number' ? record.guardian_id : undefined,
        recovery_action: typeof record.recovery_action === 'string' ? record.recovery_action : undefined,
      };
    })
    .filter((item): item is GuardianFinancialBlocker => item != null);
  return blockers.length ? blockers : undefined;
}

function normalizeEffects(raw: unknown): GuardianRemovalEffects | undefined {
  const record = asRecord(raw);
  if (!record) return undefined;
  const billing = asRecord(record.new_default_billing_entity);
  return {
    was_primary_guardian: record.was_primary_guardian === true,
    was_financial_responsible: record.was_financial_responsible === true,
    was_emergency_contact: record.was_emergency_contact === true,
    new_default_billing_entity: billing
      ? {
          type: typeof billing.type === 'string' ? billing.type : undefined,
          display_name: typeof billing.display_name === 'string' ? billing.display_name : undefined,
          guardian_id: typeof billing.guardian_id === 'number' ? billing.guardian_id : undefined,
          partner_id: typeof billing.partner_id === 'number' ? billing.partner_id : undefined,
          student_id: typeof billing.student_id === 'number' ? billing.student_id : undefined,
          relationship_id:
            typeof billing.relationship_id === 'number' ? billing.relationship_id : undefined,
        }
      : record.new_default_billing_entity === null
        ? null
        : undefined,
  };
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
    actions.remove_relationship = record.remove_relationship;
    actions.remove_guardian_relationship = record.remove_relationship;
  }
  if (typeof record.end_relationship === 'boolean') {
    actions.end_relationship = record.end_relationship;
  }
  if (typeof record.edit_relationship === 'boolean') {
    actions.edit_relationship = record.edit_relationship;
  }
  if (typeof record.link_as_guardian === 'boolean') {
    actions.link_as_guardian = record.link_as_guardian;
  }
  if (typeof record.manage_account === 'boolean') {
    actions.manage_account = record.manage_account;
  }
  if (typeof record.archive_guardian_profile === 'boolean') {
    actions.archive_guardian_profile = record.archive_guardian_profile;
  }
  if (typeof record.restore_guardian_profile === 'boolean') {
    actions.restore_guardian_profile = record.restore_guardian_profile;
  }
  if (typeof record.delete_guardian_profile === 'boolean') {
    actions.delete_guardian_profile = record.delete_guardian_profile;
  }
  if (typeof record.delete_person === 'boolean') {
    actions.delete_person = record.delete_person;
  }
  return Object.keys(actions).length ? actions : undefined;
}

export function normalizeRemovalImpactFromRaw(data: unknown): GuardianRemovalImpact | null {
  const raw = asRecord(data);
  if (!raw) return null;

  const summary = readStringList(raw.summary) ?? readStringList(raw.items);
  const otherRoles = readStringList(raw.other_roles) ?? readStringList(raw.role_labels);
  const financialBlockers = normalizeFinancialBlockers(raw.financial_blockers);
  const effects = normalizeEffects(raw.effects);
  const billingName = effects?.new_default_billing_entity?.display_name;

  return {
    can_remove:
      typeof raw.can_remove === 'boolean'
        ? raw.can_remove
        : raw.blocked === true
          ? false
          : undefined,
    blocked: raw.blocked === true,
    blocker_code: typeof raw.blocker_code === 'string' ? raw.blocker_code : undefined,
    blocker_message: typeof raw.blocker_message === 'string' ? raw.blocker_message : undefined,
    suggested_actions: normalizeSuggestedActions(raw.suggested_actions),
    summary,
    items: summary,
    other_children_count:
      typeof raw.other_children_count === 'number'
        ? raw.other_children_count
        : typeof raw.remaining_guardian_relationships === 'number'
          ? raw.remaining_guardian_relationships
          : undefined,
    linked_students_count:
      typeof raw.linked_students_count === 'number' ? raw.linked_students_count : undefined,
    other_roles: otherRoles,
    role_labels: otherRoles,
    account_preserved: raw.account_preserved === true || raw.user_account_preserved === true || undefined,
    user_account_preserved: raw.user_account_preserved === true || undefined,
    person_preserved: raw.person_preserved === true || undefined,
    professional_profile_preserved: raw.professional_profile_preserved === true || undefined,
    professional_roles: readStringList(raw.professional_roles),
    removes_primary_contact:
      raw.removes_primary_contact === true || raw.is_primary_guardian === true || undefined,
    removes_financial_responsible:
      raw.removes_financial_responsible === true || raw.is_financial_responsible === true || undefined,
    removes_legal_guardian: raw.removes_legal_guardian === true || undefined,
    removes_emergency_contact:
      raw.removes_emergency_contact === true || raw.is_emergency_contact === true || undefined,
    billing_party_change:
      typeof raw.billing_party_change === 'string'
        ? raw.billing_party_change
        : billingName ?? (raw.billing_party_change === null ? null : undefined),
    has_user_account: raw.has_user_account === true || undefined,
    needs_new_account:
      typeof raw.needs_new_account === 'boolean' ? raw.needs_new_account : undefined,
    requires_confirmation: raw.requires_confirmation === true || undefined,
    can_remove_without_confirmation: raw.can_remove_without_confirmation === true || undefined,
    multi_role_person: raw.multi_role_person === true || undefined,
    can_delete_person: raw.can_delete_person === false ? false : undefined,
    financial_blockers: financialBlockers,
    effects,
  };
}

export function impactSummaryLines(impact: GuardianRemovalImpact | null | undefined): string[] {
  if (!impact) return [];
  if (impact.summary?.length) return impact.summary;
  if (impact.items?.length) return impact.items;

  const lines: string[] = [];
  for (const blocker of impact.financial_blockers ?? []) {
    if (blocker.message) lines.push(blocker.message);
  }
  if (impact.effects?.was_primary_guardian) {
    lines.push('primary_guardian_removal');
  }
  if (impact.effects?.was_financial_responsible) {
    lines.push('financial_responsible_removal');
  }
  if (impact.effects?.was_emergency_contact) {
    lines.push('emergency_contact_removal');
  }
  if (impact.effects?.new_default_billing_entity?.display_name) {
    lines.push(`billing:${impact.effects.new_default_billing_entity.display_name}`);
  }
  if (impact.person_preserved || impact.user_account_preserved) {
    lines.push('person_preserved');
  }
  if (impact.other_roles?.length) {
    lines.push(`roles:${impact.other_roles.join(',')}`);
  }
  return lines;
}

export function impactSummaryDisplayLines(
  impact: GuardianRemovalImpact | null | undefined,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string[] {
  const raw = impactSummaryLines(impact);
  return raw.map((line) => {
    if (line === 'primary_guardian_removal') return t('admin.student360.removeImpactPrimaryGuardian');
    if (line === 'financial_responsible_removal') return t('admin.student360.removeImpactFinancial');
    if (line === 'emergency_contact_removal') return t('admin.student360.removeImpactEmergency');
    if (line === 'person_preserved') return t('admin.student360.removeImpactPersonPreserved');
    if (line.startsWith('billing:')) {
      return t('admin.student360.removeImpactBillingEntity', { name: line.slice('billing:'.length) });
    }
    if (line.startsWith('roles:')) return line.slice('roles:'.length);
    return line;
  });
}

export function isRemovalBlocked(
  impact: GuardianRemovalImpact | null | undefined,
  allowedActions?: GuardianAllowedActions | null,
): boolean {
  if (allowedActions?.remove_relationship === false) return true;
  if (allowedActions?.remove_guardian_relationship === false) return true;
  if (!impact) return false;
  if (impact.blocked === true) return true;
  if (impact.can_remove === false) return true;
  return false;
}

export function canSubmitRemoval(
  impact: GuardianRemovalImpact | null | undefined,
  allowedActions?: GuardianAllowedActions | null,
): boolean {
  if (isRemovalBlocked(impact, allowedActions)) return false;
  if (allowedActions?.remove_relationship === false) return false;
  if (allowedActions?.remove_guardian_relationship === false) return false;
  return true;
}
