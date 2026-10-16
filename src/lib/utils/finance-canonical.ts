import {
  FINANCE_CANONICAL_KEYS,
  type FinanceCanonicalKey,
  type FinanceCanonicalMetrics,
  type FinanceCanonicalValues,
} from '@/types/finance-canonical';

const GATED = new Set<FinanceCanonicalKey>([
  'recognized_collected_to_date',
  'remaining_due_to_date',
  'overdue_amount',
  'collection_rate_to_date',
]);

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function money(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Fail closed on missing/old API contracts, stale contexts and historic settlements. */
export function parseFinanceCanonicalMetrics(
  source: unknown,
  expected?: { schoolId?: number | null; academicYearId?: number | null },
): FinanceCanonicalMetrics | null {
  const raw = object(source);
  const meta = object(raw?.meta);
  const incoming = object(raw?.values);
  const availabilityRaw = object(raw?.availability);
  if (!raw || !meta || !incoming || !availabilityRaw) return null;

  const schoolId = meta.school_id;
  const yearId = meta.academic_year_id;
  const asOf = meta.as_of_date;
  if (typeof schoolId !== 'number' || !Number.isSafeInteger(schoolId) || schoolId <= 0 ||
      typeof yearId !== 'number' || !Number.isSafeInteger(yearId) || yearId <= 0 ||
      typeof asOf !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(asOf)) return null;
  if (expected?.schoolId != null && schoolId !== expected.schoolId) return null;
  if (expected?.academicYearId != null && yearId !== expected.academicYearId) return null;

  const quality = object(raw.data_quality);
  const values = {} as FinanceCanonicalValues;
  const availability: FinanceCanonicalMetrics['availability'] = {};
  for (const key of FINANCE_CANONICAL_KEYS) {
    if (!Object.hasOwn(incoming, key)) return null;
    const datum = incoming[key];
    if (datum !== null && money(datum) === null) return null;
    const flag = object(availabilityRaw[key]);
    const explicitlyUnavailable = flag?.available === false;
    const historicalBlock = GATED.has(key) &&
      (flag?.available !== true || quality?.historical_settlement_attribution_complete === false);
    const available = !explicitlyUnavailable && !historicalBlock;
    values[key] = available ? money(datum) : null;
    availability[key] = {
      available: available && values[key] !== null,
      reason_code: available ? null :
        typeof flag?.reason_code === 'string' ? flag.reason_code : 'historical_settlement_attribution_required',
    };
  }

  const currency = object(meta.currency);
  const operational = object(raw.operational_values);
  const operationalValues: Partial<FinanceCanonicalValues> = {};
  if (operational) {
    for (const key of FINANCE_CANONICAL_KEYS) {
      if (Object.hasOwn(operational, key)) operationalValues[key] = money(operational[key]);
    }
  }
  const semantics = object(raw.semantics);
  const legacy = object(raw.legacy_reconciliation);
  return {
    meta: {
      school_id: schoolId,
      academic_year_id: yearId,
      as_of_date: asOf,
      scope_basis: typeof meta.scope_basis === 'string' ? meta.scope_basis : null,
      currency: currency ? {
        name: typeof currency.name === 'string' ? currency.name : undefined,
        symbol: typeof currency.symbol === 'string' ? currency.symbol : null,
        decimal_places: typeof currency.decimal_places === 'number' ? currency.decimal_places : null,
      } : null,
    },
    values,
    availability,
    data_quality: quality ? {
      historical_settlement_attribution_complete: typeof quality.historical_settlement_attribution_complete === 'boolean'
        ? quality.historical_settlement_attribution_complete : undefined,
      historical_unattributed_amount: money(quality.historical_unattributed_amount),
      overdue_attribution_complete: typeof quality.overdue_attribution_complete === 'boolean'
        ? quality.overdue_attribution_complete : undefined,
    } : undefined,
    operational_values: operational ? operationalValues : undefined,
    semantics: semantics ? {
      scope_notes: Array.isArray(semantics.scope_notes)
        ? semantics.scope_notes.filter((item): item is string => typeof item === 'string') : undefined,
    } : undefined,
    legacy_reconciliation: legacy ? {
      fee_net_total_assessed: money(legacy.fee_net_total_assessed) ?? undefined,
      fee_net_total_note: typeof legacy.fee_net_total_note === 'string' ? legacy.fee_net_total_note : undefined,
    } : undefined,
  };
}
