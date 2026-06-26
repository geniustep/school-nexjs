import type { Parent, ParentChild } from '@/types/parent';
import type { RelationshipType } from '@/types/student-360';
import { getStudentDisplayName } from '@/lib/utils/student';

export interface FamilyGuardian {
  parent: Parent;
  relationshipType: RelationshipType | string;
}

export interface ParentFamilyGroup {
  /** Stable key from sorted child ids, or parent id for guardian-only rows. */
  id: string;
  children: ParentChild[];
  guardians: FamilyGuardian[];
}

const GUARDIAN_DISPLAY_ORDER: readonly RelationshipType[] = [
  'father',
  'mother',
  'grandfather',
  'grandmother',
  'legal_guardian',
  'uncle',
  'aunt',
  'brother',
  'sister',
  'other',
];

export function getParentChildren(parent: Parent): ParentChild[] {
  const relationships = parent.relationships;
  if (relationships && relationships.length > 0) return relationships;
  return parent.children ?? [];
}

function guardianOrderIndex(type: RelationshipType | string): number {
  const idx = GUARDIAN_DISPLAY_ORDER.indexOf(type as RelationshipType);
  return idx === -1 ? GUARDIAN_DISPLAY_ORDER.length : idx;
}

function resolveChildLinkKey(child: ParentChild): string | null {
  if (typeof child.id === 'number' && Number.isFinite(child.id) && child.id > 0) {
    return `id:${child.id}`;
  }

  const name = getStudentDisplayName(child).trim().toLowerCase();
  if (name && name !== '—') {
    return `name:${name}`;
  }

  return null;
}

function resolveGuardianRelationshipType(
  parent: Parent,
  familyChildKeys: ReadonlySet<string>,
): RelationshipType | string {
  const types: string[] = [];

  for (const child of getParentChildren(parent)) {
    const childKey = resolveChildLinkKey(child);
    if (!childKey || !familyChildKeys.has(childKey)) continue;

    const relType = child.relationship?.relationship_type ?? parent.relation;
    if (typeof relType === 'string' && relType.trim()) {
      types.push(relType.trim());
    }
  }

  if (types.length === 0) {
    return parent.relation?.trim() || 'other';
  }

  const counts = new Map<string, number>();
  for (const type of types) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function mergeChildren(parents: Parent[]): ParentChild[] {
  const byKey = new Map<string, ParentChild>();

  for (const parent of parents) {
    for (const child of getParentChildren(parent)) {
      const key = resolveChildLinkKey(child);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, child);
    }
  }

  return [...byKey.values()].sort((a, b) =>
    getChildSortKey(a).localeCompare(getChildSortKey(b), undefined, { sensitivity: 'base' }),
  );
}

function getChildSortKey(child: ParentChild): string {
  return (
    child.full_name?.trim() ||
    child.name?.trim() ||
    [child.first_name, child.last_name].filter(Boolean).join(' ') ||
    String(child.id ?? '')
  );
}

function buildFamilyId(children: ParentChild[], guardianIds: number[]): string {
  const guardianPart = [...new Set(guardianIds)].sort((a, b) => a - b).join('-') || 'none';
  if (children.length > 0) {
    const childPart =
      children
        .map((child) => resolveChildLinkKey(child))
        .filter((key): key is string => key != null)
        .sort()
        .join('|') || 'unknown';
    return `family-${childPart}-g${guardianPart}`;
  }
  return `solo-g${guardianPart}`;
}

/** Union-find grouping: guardians sharing at least one child belong to the same family. */
export function groupParentsByFamily(parents: Parent[]): ParentFamilyGroup[] {
  if (parents.length === 0) return [];

  const uniqueParents = [...new Map(parents.map((p) => [p.id, p])).values()];
  const parentById = new Map(uniqueParents.map((p) => [p.id, p]));
  const parentIds = uniqueParents.map((p) => p.id);
  const roots = new Map<number, number>();

  for (const id of parentIds) {
    roots.set(id, id);
  }

  function find(id: number): number {
    let current = id;
    while (roots.get(current) !== current) {
      const parent = roots.get(current)!;
      roots.set(current, roots.get(parent)!);
      current = roots.get(current)!;
    }
    return current;
  }

  function union(a: number, b: number): void {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      roots.set(rootA, rootB);
    }
  }

  const childKeyToParentIds = new Map<string, number[]>();
  for (const parent of uniqueParents) {
    for (const child of getParentChildren(parent)) {
      const childKey = resolveChildLinkKey(child);
      if (!childKey) continue;
      const list = childKeyToParentIds.get(childKey) ?? [];
      list.push(parent.id);
      childKeyToParentIds.set(childKey, list);
    }
  }

  for (const linkedParentIds of childKeyToParentIds.values()) {
    for (let i = 1; i < linkedParentIds.length; i += 1) {
      union(linkedParentIds[0], linkedParentIds[i]);
    }
  }

  const groupedIds = new Map<number, number[]>();
  for (const id of parentIds) {
    const root = find(id);
    const bucket = groupedIds.get(root) ?? [];
    bucket.push(id);
    groupedIds.set(root, bucket);
  }

  const families: ParentFamilyGroup[] = [];

  for (const memberIds of groupedIds.values()) {
    const uniqueMemberIds = [...new Set(memberIds)];
    const members = uniqueMemberIds
      .map((id) => parentById.get(id))
      .filter((p): p is Parent => p != null);
    const children = mergeChildren(members);
    const familyChildKeys = new Set(
      children
        .map((child) => resolveChildLinkKey(child))
        .filter((key): key is string => key != null),
    );

    const guardiansByParentId = new Map<number, FamilyGuardian>();
    for (const parent of members) {
      if (!guardiansByParentId.has(parent.id)) {
        guardiansByParentId.set(parent.id, {
          parent,
          relationshipType: resolveGuardianRelationshipType(parent, familyChildKeys),
        });
      }
    }

    const guardians = [...guardiansByParentId.values()].sort(
      (a, b) =>
        guardianOrderIndex(a.relationshipType) - guardianOrderIndex(b.relationshipType) ||
        a.parent.name.localeCompare(b.parent.name, undefined, { sensitivity: 'base' }),
    );

    families.push({
      id: buildFamilyId(children, uniqueMemberIds),
      children,
      guardians,
    });
  }

  return families.sort((a, b) => {
    const aKey = a.children[0] ? getChildSortKey(a.children[0]) : a.guardians[0]?.parent.name ?? '';
    const bKey = b.children[0] ? getChildSortKey(b.children[0]) : b.guardians[0]?.parent.name ?? '';
    return aKey.localeCompare(bKey, undefined, { sensitivity: 'base' });
  });
}
