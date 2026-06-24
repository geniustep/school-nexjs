import { buildSiblingLinesPayload } from '../utils/sibling-lines';
import { mapAdmissionImportSiblingsFields } from './admission-siblings-import-adapter';
import type {
  AdmissionReimportRawRow,
  AdmissionReimportReferenceLookup,
  AdmissionReimportRowWarning,
} from './admission-reimport-types';
import { parseSiblingLinesJson } from './admission-reimport-sibling-json';

function trim(value: unknown): string | undefined {
  if (value == null || value === false) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function firstTrim(...values: unknown[]): string | undefined {
  for (const v of values) {
    const t = trim(v);
    if (t) return t;
  }
  return undefined;
}

function lookupId(map: Map<string, number>, codeOrLabel: string | undefined): number | undefined {
  if (!codeOrLabel) return undefined;
  const key = codeOrLabel.trim().toLowerCase();
  return map.get(key);
}

export interface MapReimportRowResult {
  payload: Record<string, unknown>;
  warnings: AdmissionReimportRowWarning[];
  invalidSiblingJson: boolean;
}

/** Map spreadsheet row to API payload; omits empty values and review-only fields. */
export function mapAdmissionReimportRow(
  row: AdmissionReimportRawRow,
  refs?: AdmissionReimportReferenceLookup,
): MapReimportRowResult {
  const warnings: AdmissionReimportRowWarning[] = [];
  const payload: Record<string, unknown> = {};
  const rowNum = row.row_number;
  const extRef = trim(row.external_reference);

  if (extRef) payload.external_reference = extRef;

  const academicYearCode = trim(row.academic_year);
  if (academicYearCode && refs) {
    const id = lookupId(refs.academicYears, academicYearCode);
    if (id) payload.academic_year_id = id;
  }

  const status = trim(row.application_status);
  if (status) payload.state = status;

  const sourceCode = trim(row.admission_source);
  if (sourceCode && refs) {
    const id = lookupId(refs.sources, sourceCode);
    if (id) payload.source_id = id;
  }

  const levelCode = trim(row.target_level_code);
  if (levelCode && refs) {
    const id = lookupId(refs.levels, levelCode);
    if (id) payload.requested_level_id = id;
  }

  const firstAr = trim(row.student_first_name_ar);
  const lastAr = trim(row.student_last_name_ar);
  const fullAr = trim(row.student_full_name_ar);
  if (firstAr) payload.child_first_name_ar = firstAr;
  if (lastAr) payload.child_last_name_ar = lastAr;
  if (fullAr) {
    payload.child_name = fullAr;
    payload.student_name = fullAr;
  } else if (firstAr || lastAr) {
    const combined = [firstAr, lastAr].filter(Boolean).join(' ');
    if (combined) {
      payload.child_name = combined;
      payload.student_name = combined;
    }
  }

  const firstLatin = trim(row.student_first_name_latin);
  const lastLatin = trim(row.student_last_name_latin);
  if (firstLatin) payload.child_first_name_fr = firstLatin;
  if (lastLatin) payload.child_last_name_fr = lastLatin;

  const relationship = trim(row.guardian_relationship);
  if (relationship) {
    payload.guardian_relationship = relationship;
    payload.relationship = relationship;
  }

  const guardianPhone = trim(row.guardian_phone);
  if (guardianPhone) payload.guardian_phone = guardianPhone;

  const whatsapp = firstTrim(row.guardian_whatsapp, row.guardian_phone_secondary);
  if (whatsapp) payload.guardian_whatsapp = whatsapp;

  const previousSchool = firstTrim(row.previous_school, row.current_school);
  if (previousSchool) payload.previous_school = previousSchool;

  const address = firstTrim(row.residence_address, row.address);
  if (address) payload.residence_address = address;

  const internalNotes = firstTrim(row.internal_notes, row.notes);
  if (internalNotes) payload.internal_notes = internalNotes;

  const siblingsLevels = trim(row.siblings_levels);
  const siblingsRawFromFile = trim(row.siblings_raw_text);
  const siblings = mapAdmissionImportSiblingsFields({
    has_siblings: row.has_siblings,
    siblings_levels: siblingsLevels,
    siblings_text: siblingsRawFromFile ?? siblingsLevels,
  });

  if (siblings.has_siblings != null) payload.has_siblings = siblings.has_siblings;
  if (siblings.siblings_levels) payload.siblings_levels = siblings.siblings_levels;
  if (siblings.siblings_raw_text) payload.siblings_raw_text = siblings.siblings_raw_text;
  if (siblings.sibling_lines?.length) payload.sibling_lines = siblings.sibling_lines;

  let invalidSiblingJson = false;
  const jsonRaw = trim(row.sibling_lines_json);
  if (jsonRaw) {
    const parsed = parseSiblingLinesJson(jsonRaw);
    if (parsed.error) {
      invalidSiblingJson = true;
      warnings.push({
        row_number: rowNum,
        external_reference: extRef,
        code: 'invalid_sibling_lines_json',
        message: parsed.error,
      });
      if (!payload.siblings_raw_text && jsonRaw) {
        payload.siblings_raw_text = jsonRaw;
      }
    } else if (parsed.lines?.length) {
      const built = buildSiblingLinesPayload(parsed.lines);
      if (built?.length) payload.sibling_lines = built;
    }
  }

  return { payload, warnings, invalidSiblingJson };
}

/** Strip empty strings from payload — used before PATCH to avoid clearing Odoo values. */
export function omitEmptyPayloadFields(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}
