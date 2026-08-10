import type { Parent, ParentChild } from '@/types/parent';

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function account(raw: unknown): Parent['account'] {
  const value = record(raw);
  if (!value) return null;
  return {
    has_user_account: value.has_user_account === true,
    user_id: typeof value.user_id === 'number' ? value.user_id : null,
    login: typeof value.login === 'string' ? value.login : null,
    status: typeof value.status === 'string' ? value.status : null,
  };
}

function childLinks(raw: Record<string, unknown>): ParentChild[] {
  const links = Array.isArray(raw.links) ? raw.links : [];
  return links.flatMap((item) => {
    const link = record(item);
    if (!link || typeof link.student_id !== 'number') return [];
    return [{
      id: link.student_id,
      name: '',
      relationship: {
        relationship_id: typeof link.relationship_id === 'number' ? link.relationship_id : undefined,
        relationship_type: typeof link.relationship_type === 'string' ? link.relationship_type : 'other',
        state: 'active',
        active: true,
      },
    } satisfies ParentChild];
  });
}

function normalizeContextGuardian(value: unknown): Parent | null {
  const raw = record(value);
  if (!raw || typeof raw.id !== 'number') return null;
  const children = childLinks(raw);
  const hasAccount = account(raw.account);
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : '',
    phone: typeof raw.phone === 'string' ? raw.phone : null,
    mobile: typeof raw.mobile === 'string' ? raw.mobile : null,
    email: typeof raw.email === 'string' ? raw.email : null,
    relation: typeof raw.relationship_type === 'string' ? raw.relationship_type : null,
    account: hasAccount,
    has_account: hasAccount?.has_user_account === true,
    has_user_account: hasAccount?.has_user_account === true,
    user_id: hasAccount?.user_id ?? null,
    children,
    relationships: children,
    linked_students_count: children.length,
    status: typeof raw.status === 'string' ? raw.status : 'active',
  };
}

/** Expand additive Odoo family_guardians context before family grouping. */
export function expandParentsWithFamilyGuardians(rawRows: unknown, normalizedRows: Parent[]): Parent[] {
  if (!Array.isArray(rawRows)) return normalizedRows;
  const byId = new Map(normalizedRows.map((parent) => [parent.id, parent]));

  for (const row of rawRows) {
    const raw = record(row);
    if (!raw || !Array.isArray(raw.family_guardians)) continue;
    for (const item of raw.family_guardians) {
      const guardian = normalizeContextGuardian(item);
      if (!guardian) continue;
      const existing = byId.get(guardian.id);
      if (!existing) {
        byId.set(guardian.id, guardian);
        continue;
      }
      const existingChildIds = new Set((existing.children ?? []).map((child) => child.id));
      const extraChildren = (guardian.children ?? []).filter((child) => !existingChildIds.has(child.id));
      if (extraChildren.length > 0) {
        byId.set(existing.id, {
          ...existing,
          children: [...(existing.children ?? []), ...extraChildren],
          relationships: [...(existing.relationships ?? existing.children ?? []), ...extraChildren],
        });
      }
    }
  }

  return [...byId.values()];
}
