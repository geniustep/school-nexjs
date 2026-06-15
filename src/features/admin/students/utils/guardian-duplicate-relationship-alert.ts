import type { GuardianRelationship, RelationshipType } from '@/types/student-360';
import { isRelationshipActive, relationshipTypeLabel } from './relationship-types';
import type { TranslateFn } from '@/features/i18n/locale-context';

const DUPLICATE_ALERT_TYPES = new Set<RelationshipType>(['father', 'mother']);

export interface DuplicateRelationshipAlert {
  type: RelationshipType;
  label: string;
  count: number;
}

export function findDuplicateStrongRelationshipTypes(
  relationships: GuardianRelationship[],
): DuplicateRelationshipAlert[] {
  const counts = new Map<RelationshipType, number>();

  for (const rel of relationships) {
    if (!isRelationshipActive(rel.state, rel.active)) continue;
    if (!DUPLICATE_ALERT_TYPES.has(rel.relationship_type)) continue;
    counts.set(rel.relationship_type, (counts.get(rel.relationship_type) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([type, count]) => ({ type, label: type, count }));
}

export function duplicateRelationshipMessage(
  t: TranslateFn,
  alerts: DuplicateRelationshipAlert[],
): string | null {
  if (!alerts.length) return null;
  if (alerts.length === 1) {
    const label = relationshipTypeLabel(t, alerts[0].type);
    return t('admin.student360.guardiansDuplicateRelationshipSingle', { type: label });
  }
  return t('admin.student360.guardiansDuplicateRelationshipMultiple');
}
