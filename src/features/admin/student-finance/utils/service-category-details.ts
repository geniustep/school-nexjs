import type { FinancialAgreementLine, ServiceSubscription } from '../types';

type DetailItem = { key: string; value: string };

export type ServiceCategoryDetailItem = DetailItem;

function refLabel(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object' && value !== null && 'name' in value) {
    const name = (value as { name?: string }).name;
    return name ? String(name) : null;
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => refLabel(item))
      .filter((item): item is string => !!item);
    return parts.length ? parts.join(', ') : null;
  }
  return null;
}

const CANTEEN_FIELD_KEYS = [
  ['subscription_type', 'subscriptionType'],
  ['pricing_unit', 'pricingUnit'],
  ['meal_types', 'mealTypes'],
  ['units_included', 'unitsIncluded'],
  ['extra_unit_price', 'extraUnitPrice'],
  ['grouping_method', 'groupingMethod'],
] as const;

const TRANSPORT_FIELD_KEYS = [
  ['line', 'line'],
  ['zone', 'zone'],
  ['direction', 'direction'],
  ['pickup_stop', 'pickupStop'],
  ['dropoff_stop', 'dropoffStop'],
  ['selected_days', 'selectedDays'],
  ['pricing_method', 'pricingMethod'],
] as const;

function pickDetails(
  source: Record<string, unknown> | null | undefined,
  fields: readonly (readonly [string, string])[],
): DetailItem[] {
  if (!source) return [];
  const items: DetailItem[] = [];
  for (const [apiKey, labelKey] of fields) {
    const value = refLabel(source[apiKey]);
    if (value) items.push({ key: labelKey, value });
  }
  return items;
}

export function extractCanteenDetails(
  source: Record<string, unknown> | null | undefined,
): DetailItem[] {
  return pickDetails(source, CANTEEN_FIELD_KEYS);
}

export function extractTransportDetails(
  source: Record<string, unknown> | null | undefined,
): DetailItem[] {
  return pickDetails(source, TRANSPORT_FIELD_KEYS);
}

export function agreementLineCategory(line: FinancialAgreementLine): string | null {
  return line.service?.category ?? null;
}

export function agreementLineCategoryDetails(line: FinancialAgreementLine): DetailItem[] {
  const category = agreementLineCategory(line);
  if (category === 'canteen' || category === 'meals') {
    return extractCanteenDetails(line.canteen_settings ?? undefined);
  }
  if (category === 'transport') {
    return extractTransportDetails(line.transport_settings ?? undefined);
  }
  return [];
}

export function subscriptionCategoryDetails(sub: ServiceSubscription): DetailItem[] {
  const category = sub.service?.category;
  if (category === 'canteen' || category === 'meals') {
    return extractCanteenDetails(sub.canteen_details ?? undefined);
  }
  if (category === 'transport') {
    return extractTransportDetails(sub.transport_details ?? undefined);
  }
  return [];
}

export function hasAgreementLineCategoryDetails(line: FinancialAgreementLine): boolean {
  return agreementLineCategoryDetails(line).length > 0;
}

export function hasSubscriptionCategoryDetails(sub: ServiceSubscription): boolean {
  return subscriptionCategoryDetails(sub).length > 0;
}
