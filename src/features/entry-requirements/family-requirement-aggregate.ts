import {
  familyRequirementItems,
  requirementItemTypeLabel,
  type ParentRequirementFamily,
  type RequirementItem,
} from './entry-requirements-contract';

export type FamilyRequirementAggregateRow = {
  key: string;
  name: string;
  quantity: number;
  type: string;
  children: Array<{ name: string; quantity: number }>;
};

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

function normalizeIsbn(value: string | null | undefined): string {
  return normalize(value).replace(/[\s-]+/g, '');
}

export function familyRequirementAggregateKey(item: RequirementItem): string {
  if (item.teaching_reference_id) {
    return `teaching-reference:${item.teaching_reference_id}`;
  }

  const isbn = normalizeIsbn(item.isbn);
  if (isbn) {
    return `isbn:${isbn}`;
  }

  return [
    item.item_type,
    normalize(item.name),
    normalize(item.publisher),
    normalize(item.edition),
    normalize(item.notes),
  ].join('|');
}

export function buildFamilyRequirementAggregate(
  family: ParentRequirementFamily,
): FamilyRequirementAggregateRow[] {
  const rows = new Map<string, FamilyRequirementAggregateRow>();

  for (const child of family.children) {
    for (const item of familyRequirementItems(child).filter(
      (row) => row.provision_source === 'family',
    )) {
      const key = familyRequirementAggregateKey(item);
      const current = rows.get(key) ?? {
        key,
        name: item.name,
        quantity: 0,
        type: requirementItemTypeLabel(item.item_type),
        children: [],
      };
      const quantity = Number(item.quantity) || 0;
      current.quantity += quantity;
      current.children.push({ name: child.student.name, quantity });
      rows.set(key, current);
    }
  }

  return [...rows.values()].sort(
    (a, b) => a.type.localeCompare(b.type, 'ar') || a.name.localeCompare(b.name, 'ar'),
  );
}
