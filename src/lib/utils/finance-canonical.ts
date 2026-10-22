import {
  FINANCE_CANONICAL_KEYS,
  FINANCE_CANONICAL_EXTRA_KEYS,
  FINANCE_CANONICAL_PERIOD_KEYS,
  type FinanceCanonicalPeriodMetrics,
  type FinanceCanonicalPeriodKey,
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
      typeof asOf !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(asOf)) return null;
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

  // New year-stock fields are optional so legacy production remains readable.
  for (const key of FINANCE_CANONICAL_EXTRA_KEYS) {
    if (!Object.hasOwn(incoming, key)) continue;
    const datum = incoming[key];
    if (datum !== null && money(datum) === null) return null;
    const flag = object(availabilityRaw[key]);
    values[key] = flag?.available === false ? null : money(datum);
    availability[key] = {
      available: flag?.available !== false && values[key] !== null,
      reason_code: flag?.available === false && typeof flag.reason_code === 'string'
        ? flag.reason_code : null,
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

/** Read the additive period contract; never infer period cash from yearly fee stock. */
export function parseFinanceCanonicalPeriodMetrics(
  source: unknown,
  expected?: {
    schoolId?: number | null;
    academicYearId?: number | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  },
): FinanceCanonicalPeriodMetrics | null {
  const raw = object(source);
  const meta = object(raw?.meta);
  const incoming = object(raw?.values);
  if (!meta || !incoming) return null;
  const schoolId = meta.school_id, yearId = meta.academic_year_id;
  const from = meta.date_from, to = meta.date_to, asOf = meta.as_of_date;
  const validDate = (v: unknown): v is string =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (typeof schoolId !== 'number' || !Number.isSafeInteger(schoolId) || schoolId <= 0 ||
    typeof yearId !== 'number' || !Number.isSafeInteger(yearId) || yearId <= 0 ||
    !validDate(from) || !validDate(to) || !validDate(asOf) || from > to) return null;
  if (expected?.schoolId != null && schoolId !== expected.schoolId) return null;
  if (expected?.academicYearId != null && yearId !== expected.academicYearId) return null;
  if (expected?.dateFrom && from !== expected.dateFrom) return null;
  if (expected?.dateTo && to !== expected.dateTo) return null;

  const values = {} as Record<FinanceCanonicalPeriodKey, number | null>;
  for (const key of FINANCE_CANONICAL_PERIOD_KEYS) {
    if (!Object.hasOwn(incoming, key)) return null;
    const datum = incoming[key];
    if (datum !== null && money(datum) === null) return null;
    values[key] = money(datum);
  }
  const currency = object(meta.currency);
  const recon = object(raw?.collections_reconciliation);
  const semantics = object(raw?.semantics);
  return {
    meta: {
      school_id: schoolId as number,
      academic_year_id: yearId as number,
      date_from: from,
      date_to: to,
      as_of_date: asOf,
      currency: currency ? {
        name: typeof currency.name === 'string' ? currency.name : undefined,
        symbol: typeof currency.symbol === 'string' ? currency.symbol : null,
        decimal_places: typeof currency.decimal_places === 'number' ? currency.decimal_places : null,
      } : null,
    },
    values,
    semantics: semantics ?? undefined,
    collections_reconciliation: recon ? {
      only_in_all_confirmed_count: typeof recon.only_in_all_confirmed_count === 'number' ? recon.only_in_all_confirmed_count : undefined,
      only_in_all_confirmed_amount: money(recon.only_in_all_confirmed_amount) ?? undefined,
      exclusion_reasons: Array.isArray(recon.exclusion_reasons)
        ? recon.exclusion_reasons.filter((x): x is string => typeof x === 'string') : undefined,
    } : undefined,
  };
}
