/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Presentation helpers for Services catalog list chrome.
 * Does not change create/update payload, pricing, or priority semantics.
 */

import {
  collectionPriorityBadgeTone,
  collectionPriorityLabelKey,
  normalizeCollectionPriorityLevel,
} from '@/features/admin/finance/finance-service-priority';

export const SERVICES_PAGE_SIZE = 20;

export type ServicesListEmptyVariant = 'no-data' | 'no-match';

export type ServicesActiveQueryInput = {
  search?: string;
};

export function servicesListHasActiveQuery(options: ServicesActiveQueryInput): boolean {
  return Boolean(options.search?.trim());
}

export function resolveServicesListEmptyVariant(options: {
  hasActiveQuery: boolean;
}): ServicesListEmptyVariant {
  return options.hasActiveQuery ? 'no-match' : 'no-data';
}

/** List presentation only — reuses stable priority contract helpers. */
export function resolveServiceListPriorityLevel(level: string | null | undefined): string {
  return normalizeCollectionPriorityLevel(level);
}

export function resolveServiceListPriorityLabelKey(level: string | null | undefined): string {
  return collectionPriorityLabelKey(level);
}

export function resolveServiceListPriorityTone(
  level: string | null | undefined,
): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  return collectionPriorityBadgeTone(level);
}

/** Optional amount presentation when catalog item includes default_amount. */
export function resolveServiceListDefaultAmount(
  amount: number | null | undefined,
): number | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
  return amount;
}
