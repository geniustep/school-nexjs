import type { TranslateFn } from '@/features/i18n/locale-context';
import type { RelationshipType } from '@/types/student-360';

export const RELATIONSHIP_TYPE_CODES: readonly RelationshipType[] = [
  'father',
  'mother',
  'legal_guardian',
  'grandfather',
  'grandmother',
  'brother',
  'sister',
  'uncle',
  'aunt',
  'other',
] as const;

export function relationshipTypeLabel(t: TranslateFn, type: RelationshipType | string): string {
  const key = `admin.student360.relationshipType.${type}`;
  const msg = t(key);
  return msg !== key ? msg : type;
}

export function isRelationshipActive(state: string, active?: boolean): boolean {
  if (active === false) return false;
  return state !== 'ended';
}
