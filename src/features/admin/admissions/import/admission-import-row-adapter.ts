import {
  mapAdmissionImportSiblingsFields,
  type AdmissionImportSiblingsInput,
} from './admission-siblings-import-adapter';

export interface AdmissionImportRowInput extends AdmissionImportSiblingsInput {
  external_reference?: string | null;
  residence_address?: string | null;
  previous_school?: string | null;
  internal_notes?: string | null;
}

function trim(value: unknown): string | undefined {
  if (value == null || value === false) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

/** Maps a 2026-2027 admission import row to API-ready sibling + extra field payload. */
export function mapAdmissionImportRow(input: AdmissionImportRowInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const externalReference = trim(input.external_reference);
  if (externalReference) payload.external_reference = externalReference;
  const residenceAddress = trim(input.residence_address);
  if (residenceAddress) payload.residence_address = residenceAddress;
  const previousSchool = trim(input.previous_school);
  if (previousSchool) payload.previous_school = previousSchool;
  const internalNotes = trim(input.internal_notes);
  if (internalNotes) payload.internal_notes = internalNotes;

  const siblings = mapAdmissionImportSiblingsFields({
    has_siblings: input.has_siblings,
    siblings_levels: input.siblings_levels,
    siblings_text: input.siblings_text ?? input.siblings_levels,
  });

  if (siblings.has_siblings != null) payload.has_siblings = siblings.has_siblings;
  if (siblings.siblings_levels) payload.siblings_levels = siblings.siblings_levels;
  if (siblings.siblings_raw_text) payload.siblings_raw_text = siblings.siblings_raw_text;
  if (siblings.sibling_lines?.length) payload.sibling_lines = siblings.sibling_lines;

  return payload;
}
