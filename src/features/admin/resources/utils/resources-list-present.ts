/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

export const RESOURCES_PAGE_SIZE = 20;

export const RESOURCE_LIST_STATES = ['draft', 'published', 'archived'] as const;

export type ResourceListState = (typeof RESOURCE_LIST_STATES)[number];

export type ResourcesListEmptyVariant = 'no-data' | 'no-match';

export function resourcesListHasActiveQuery(options: {
  classId?: string;
  stateFilter?: string;
  typeFilter?: string;
}): boolean {
  return !!(options.classId || options.stateFilter || options.typeFilter?.trim());
}

export function resolveResourcesListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): ResourcesListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

export function formatResourceListDate(
  value: string | null | undefined,
  formatDate: (value: string | null | undefined) => string,
  emptyLabel: string,
): string {
  if (!value) return emptyLabel;
  return formatDate(value);
}

export function formatResourceTypeLabel(
  value: string | null | undefined,
  emptyLabel: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed) return emptyLabel;
  return trimmed.toUpperCase();
}
