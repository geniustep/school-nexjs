import type { RequirementItem } from './entry-requirements-contract';

export function textbookReferenceTitle(
  item: Pick<RequirementItem, 'item_type' | 'title' | 'name'>,
): string | null {
  if (item.item_type !== 'textbook') return null;

  const title = item.title?.trim();
  if (title) return title;

  const name = item.name.trim();
  return name || '—';
}
