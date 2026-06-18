import type { GuardianAllowedActions, PersonSearchResult } from '@/types/student-360';
import type { Parent } from '@/types/parent';
import type { CurrentUser } from '@/types/user';
import { canLinkGuardianCandidate } from './guardian-candidate-presentation';

export function isPersonArchived(
  person: Pick<PersonSearchResult | Parent, 'archived' | 'status'>,
): boolean {
  if (person.archived === true) return true;
  return person.status === 'archived';
}

export function resolvePersonStatusLabel(
  person: Pick<PersonSearchResult | Parent, 'archived' | 'status'> & { active?: boolean },
): 'active' | 'archived' {
  if (isPersonArchived(person)) return 'archived';
  if (person.status === 'active' || person.active === true) return 'active';
  if (person.status && person.status !== 'archived') return 'active';
  return 'active';
}

export function canLinkPersonAsGuardian(
  person: Pick<PersonSearchResult, 'can_link_as_guardian' | 'allowed_actions' | 'archived' | 'status'>,
  alreadyLinked: boolean,
): boolean {
  if (alreadyLinked) return false;
  if (isPersonArchived(person)) return false;
  return canLinkGuardianCandidate(person);
}

export function canRestoreGuardianProfile(
  actions?: GuardianAllowedActions | null,
): boolean {
  return actions?.restore_guardian_profile === true;
}

export function canDeleteGuardianProfile(
  actions: GuardianAllowedActions | null | undefined,
  user: CurrentUser | null,
): boolean {
  if (actions?.delete_guardian_profile !== true) return false;
  return hasGuardianDeletePermanentlyCapability(user);
}

export function canDeleteOrphanPerson(
  actions: GuardianAllowedActions | null | undefined,
  user: CurrentUser | null,
): boolean {
  if (actions?.delete_person !== true) return false;
  return hasGuardianDeletePermanentlyCapability(user);
}

export function hasGuardianDeletePermanentlyCapability(user: CurrentUser | null): boolean {
  if (!user?.effective_capabilities?.length) return false;
  return user.effective_capabilities.includes('guardian.delete_permanently');
}

export function guardianProfileId(
  person: Pick<PersonSearchResult, 'guardian_id' | 'id'>,
): number | null {
  if (typeof person.guardian_id === 'number') return person.guardian_id;
  if (typeof person.id === 'number') return person.id;
  return null;
}
