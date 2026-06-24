import type {
  AdmissionExistingRef,
  AdmissionReimportDryRunResult,
  AdmissionReimportOptions,
  AdmissionReimportPlanRow,
  AdmissionReimportRawRow,
  AdmissionReimportReferenceLookup,
  AdmissionReimportRowAction,
  AdmissionReimportRowWarning,
} from './admission-reimport-types';
import { normalizeExternalReference } from './admission-reimport-lookup';
import { mapAdmissionReimportRow, omitEmptyPayloadFields } from './admission-reimport-row-mapper';

export function isUpsertMode(options: AdmissionReimportOptions): boolean {
  return options.mode === 'upsert' || options.reimport === true;
}

/** Build lookup map from external_reference → admission id. Detects duplicate refs in Odoo. */
export function buildExternalReferenceIndex(existing: AdmissionExistingRef[]): {
  byRef: Map<string, number>;
  duplicateRefs: string[];
} {
  const byRef = new Map<string, number>();
  const duplicateRefs: string[] = [];

  for (const item of existing) {
    const ref = normalizeExternalReference(item.external_reference);
    if (!ref) continue;
    const key = ref.toLowerCase();
    if (byRef.has(key)) {
      if (!duplicateRefs.includes(key)) duplicateRefs.push(key);
      continue;
    }
    byRef.set(key, item.id);
  }

  return { byRef, duplicateRefs };
}

export function resolveUpsertAction(
  externalReference: string | undefined,
  byRef: Map<string, number>,
  duplicateRefs: string[],
  allowCreate: boolean,
): AdmissionReimportRowAction {
  const ref = externalReference?.trim();
  if (!ref) {
    return { kind: 'skip', reason: 'missing_external_reference' };
  }
  const key = ref.toLowerCase();
  if (duplicateRefs.includes(key)) {
    return { kind: 'skip', reason: 'duplicate_external_reference_in_odoo', external_reference: ref };
  }
  const id = byRef.get(key);
  if (id != null) {
    return { kind: 'patch', admissionId: id, external_reference: ref };
  }
  if (allowCreate) {
    return { kind: 'create', external_reference: ref };
  }
  return { kind: 'skip', reason: 'external_reference_not_found', external_reference: ref };
}

export function planAdmissionReimportRows(
  rows: AdmissionReimportRawRow[],
  existing: AdmissionExistingRef[],
  options: AdmissionReimportOptions,
  refs?: AdmissionReimportReferenceLookup,
): AdmissionReimportDryRunResult {
  const upsert = isUpsertMode(options);
  const allowCreate = options.allowCreate === true && upsert;
  const { byRef, duplicateRefs } = buildExternalReferenceIndex(existing);

  const planRows: AdmissionReimportPlanRow[] = [];
  const allWarnings: AdmissionReimportRowWarning[] = [];

  let matched = 0;
  let patchedPlanned = 0;
  let createdPlanned = 0;
  let skipped = 0;
  let missingExternalReference = 0;
  let invalidSiblingLinesJson = 0;

  for (const row of rows) {
    const { payload: rawPayload, warnings, invalidSiblingJson } = mapAdmissionReimportRow(row, refs);
    const payload = omitEmptyPayloadFields(rawPayload);
    allWarnings.push(...warnings);
    if (invalidSiblingJson) invalidSiblingLinesJson += 1;

    let action: AdmissionReimportRowAction;
    if (!upsert) {
      action = trimRef(row.external_reference)
        ? { kind: 'create', external_reference: trimRef(row.external_reference)! }
        : { kind: 'skip', reason: 'missing_external_reference' };
    } else {
      action = resolveUpsertAction(trimRef(row.external_reference), byRef, duplicateRefs, allowCreate);
    }

    if (action.kind === 'patch') {
      matched += 1;
      patchedPlanned += 1;
    } else if (action.kind === 'create') {
      createdPlanned += 1;
    } else {
      skipped += 1;
      if (action.reason === 'missing_external_reference') missingExternalReference += 1;
    }

    planRows.push({
      row_number: row.row_number,
      external_reference: trimRef(row.external_reference),
      action,
      payload,
      warnings,
    });
  }

  return {
    total_rows: rows.length,
    matched,
    patched_planned: patchedPlanned,
    created_planned: createdPlanned,
    skipped,
    missing_external_reference: missingExternalReference,
    invalid_sibling_lines_json: invalidSiblingLinesJson,
    potential_duplicates: duplicateRefs.length,
    warnings: allWarnings,
    rows: planRows,
  };
}

function trimRef(value: unknown): string | undefined {
  if (value == null || value === false) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

/** Merge file payload over existing detail without clearing non-empty Odoo values with empty file cells. */
export function mergeNonDestructivePatch(
  existing: Record<string, unknown>,
  filePayload: Record<string, unknown>,
): Record<string, unknown> {
  const patch = omitEmptyPayloadFields(filePayload);
  const out: Record<string, unknown> = { ...patch };

  for (const key of Object.keys(patch)) {
    const incoming = patch[key];
    const current = existing[key];
    if (incoming === undefined) {
      delete out[key];
      continue;
    }
    if (typeof incoming === 'string' && !incoming.trim() && current != null && String(current).trim()) {
      delete out[key];
    }
  }

  return out;
}

export function isDryRunSafe(result: AdmissionReimportDryRunResult): boolean {
  if (result.potential_duplicates > 0) return false;
  const matchRate =
    result.total_rows > 0 ? result.matched / result.total_rows : 0;
  if (result.total_rows >= 10 && matchRate < 0.5) return false;
  if (result.missing_external_reference > result.total_rows * 0.1) return false;
  return true;
}

export function selectSampleRows(
  plan: AdmissionReimportDryRunResult,
  sampleSize: number,
): AdmissionReimportPlanRow[] {
  const patchRows = plan.rows.filter((r) => r.action.kind === 'patch');
  if (!patchRows.length) return [];

  const picked: AdmissionReimportPlanRow[] = [];
  const used = new Set<number>();

  function pick(predicate: (row: AdmissionReimportPlanRow) => boolean) {
    const found = patchRows.find((r) => !used.has(r.row_number) && predicate(r));
    if (found) {
      picked.push(found);
      used.add(found.row_number);
    }
  }

  pick((r) => Boolean(r.payload.siblings_raw_text));
  pick((r) => Boolean(r.warnings.some((w) => w.code === 'invalid_sibling_lines_json')));
  pick((r) => r.payload.has_siblings === false);
  pick((r) => Boolean(r.payload.previous_school));
  pick((r) => Boolean(r.payload.internal_notes));
  pick((r) => Boolean(r.payload.requested_level_id));

  for (const row of patchRows) {
    if (picked.length >= sampleSize) break;
    if (used.has(row.row_number)) continue;
    picked.push(row);
    used.add(row.row_number);
  }

  return picked.slice(0, sampleSize);
}
