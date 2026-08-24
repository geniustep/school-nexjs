import type { Parent, ParentChild } from '@/types/parent';
import type { GuardianAccessContractFields } from '@/types/guardian-access';
import type { GuardianRelationship } from '@/types/student-360';

export function parentChildToGuardianRelationship(
  parent: Parent,
  child: ParentChild,
): (GuardianRelationship & GuardianAccessContractFields) | null {
  const rel = child.relationship;
  if (!rel?.relationship_id) return null;

  const hasAccount =
    parent.account?.has_user_account === true ||
    !!(parent.has_user_account ?? parent.has_account);

  return {
    relationship_id: rel.relationship_id,
    guardian: {
      id: parent.id,
      name: parent.name,
      phone: parent.phone,
      email: parent.email,
      role_labels: parent.role_labels,
      existing_roles: parent.existing_roles,
      has_account: hasAccount,
      has_user_account: hasAccount,
    },
    relationship_type: rel.relationship_type ?? 'other',
    legal_status: rel.legal_status,
    account_access_policy: rel.account_access_policy,
    account_access_eligible: rel.account_access_eligible,
    is_primary_contact: rel.is_primary_contact ?? false,
    is_legal_guardian: rel.is_legal_guardian ?? false,
    is_financial_responsible: rel.is_financial_responsible ?? false,
    receives_notifications: rel.receives_notifications ?? true,
    is_emergency_contact: rel.is_emergency_contact ?? false,
    is_authorized_pickup: rel.is_authorized_pickup ?? false,
    state: rel.state ?? 'active',
    active: rel.active !== false,
    allowed_actions: rel.allowed_actions,
    removal_impact: rel.removal_impact,
  };
}
