import type { Parent, ParentChild } from '@/types/parent';
import type { SchoolRef } from '@/types/api';
import type { RelationshipType } from '@/types/student-360';
import { getStudentDisplayName } from '@/lib/utils/student';

export interface FamilyGuardian {
  parent: Parent;
  relationshipType: RelationshipType | string;
}

export interface ParentFamilyGroup {
  /** Stable key from school + sorted child ids, or guardian id for guardian-only rows. */
  id: string;
  school: SchoolRef | null;
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

function schoolKey(parent: Parent): string {
  return parent.school?.id != null ? `school:${parent.school.id}` : 'school:unknown';
}

function parentNodeKey(parent: Parent): string {
  return `${schoolKey(parent)}:parent:${parent.id}`;
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

function mergeChildren(parents: Parent[], school: SchoolRef | null): ParentChild[] {
  const byKey = new Map<string, ParentChild>();

  for (const parent of parents) {
    for (const child of getParentChildren(parent)) {
      const key = resolveChildLinkKey(child);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, child.school ? child : { ...child, school });
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

function buildFamilyId(
  children: ParentChild[],
  guardianIds: number[],
  school: SchoolRef | null,
): string {
  const schoolPart = school?.id != null ? `s${school.id}` : 'sunknown';
  const guardianPart = [...new Set(guardianIds)].sort((a, b) => a - b).join('-') || 'none';
  if (children.length > 0) {
    const childPart =
      children
        .map((child) => resolveChildLinkKey(child))
        .filter((key): key is string => key != null)
        .sort()
        .join('|') || 'unknown';
    return `${schoolPart}-family-${childPart}-g${guardianPart}`;
  }
  return `${schoolPart}-solo-g${guardianPart}`;
}

/**
 * Union-find grouping: guardians sharing at least one child belong to the same family.
 * School identity is part of every graph key so all-schools rows can never merge families
 * across school boundaries, including legacy name-only child fallbacks.
 */
export function groupParentsByFamily(parents: Parent[]): ParentFamilyGroup[] {
  if (parents.length === 0) return [];

  const uniqueParents = [
    ...new Map(parents.map((parent) => [parentNodeKey(parent), parent])).values(),
  ];
  const parentByKey = new Map(uniqueParents.map((parent) => [parentNodeKey(parent), parent]));
  const parentKeys = uniqueParents.map(parentNodeKey);
  const roots = new Map<string, string>();

  for (const key of parentKeys) {
    roots.set(key, key);
  }

  function find(key: string): string {
    let current = key;
    while (roots.get(current) !== current) {
      const parent = roots.get(current)!;
      roots.set(current, roots.get(parent)!);
      current = roots.get(current)!;
    }
    return current;
  }

  function union(a: string, b: string): void {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      roots.set(rootA, rootB);
    }
  }

  const childKeyToParentKeys = new Map<string, string[]>();
  for (const parent of uniqueParents) {
    for (const child of getParentChildren(parent)) {
      const childKey = resolveChildLinkKey(child);
      if (!childKey) continue;
      const scopedChildKey = `${schoolKey(parent)}|${childKey}`;
      const list = childKeyToParentKeys.get(scopedChildKey) ?? [];
      list.push(parentNodeKey(parent));
      childKeyToParentKeys.set(scopedChildKey, list);
    }
  }

  for (const linkedParentKeys of childKeyToParentKeys.values()) {
    for (let i = 1; i < linkedParentKeys.length; i += 1) {
      union(linkedParentKeys[0], linkedParentKeys[i]);
    }
  }

  const groupedKeys = new Map<string, string[]>();
  for (const key of parentKeys) {
    const root = find(key);
    const bucket = groupedKeys.get(root) ?? [];
    bucket.push(key);
    groupedKeys.set(root, bucket);
  }

  const families: ParentFamilyGroup[] = [];

  for (const memberKeys of groupedKeys.values()) {
    const members = [...new Set(memberKeys)]
      .map((key) => parentByKey.get(key))
      .filter((parent): parent is Parent => parent != null);
    const school = members.find((member) => member.school)?.school ?? null;
    const children = mergeChildren(members, school);
    const familyChildKeys = new Set(
      children
        .map((child) => resolveChildLinkKey(child))
        .filter((key): key is string => key != null),
    );

    const guardiansByParentKey = new Map<string, FamilyGuardian>();
    for (const parent of members) {
      const key = parentNodeKey(parent);
      if (!guardiansByParentKey.has(key)) {
        guardiansByParentKey.set(key, {
          parent,
          relationshipType: resolveGuardianRelationshipType(parent, familyChildKeys),
        });
      }
    }

    const guardians = [...guardiansByParentKey.values()].sort(
      (a, b) =>
        guardianOrderIndex(a.relationshipType) - guardianOrderIndex(b.relationshipType) ||
        a.parent.name.localeCompare(b.parent.name, undefined, { sensitivity: 'base' }),
    );

    families.push({
      id: buildFamilyId(children, members.map((member) => member.id), school),
      school,
      children,
      guardians,
    });
  }

  return families.sort((a, b) => {
    const aSchool = a.school?.name ?? '';
    const bSchool = b.school?.name ?? '';
    const schoolCompare = aSchool.localeCompare(bSchool, undefined, { sensitivity: 'base' });
    if (schoolCompare !== 0) return schoolCompare;
    const aKey = a.children[0] ? getChildSortKey(a.children[0]) : a.guardians[0]?.parent.name ?? '';
    const bKey = b.children[0] ? getChildSortKey(b.children[0]) : b.guardians[0]?.parent.name ?? '';
    return aKey.localeCompare(bKey, undefined, { sensitivity: 'base' });
  });
}
