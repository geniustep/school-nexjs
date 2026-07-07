import type { PatchAdmissionPayload } from '@/types/admission';
import { siblingLinesFingerprint } from './sibling-lines';

/** Fields known to work on admission limited PATCH (reimport upsert + next-action box). */
export const ADMISSION_LIMITED_PATCH_KEYS = [
  'next_action',
  'next_action_date',
  'external_reference',
  'residence_address',
  'previous_school',
  'has_siblings',
  'siblings_levels',
  'siblings_raw_text',
  'sibling_lines',
  'internal_notes',
  'child_first_name_ar',
  'child_last_name_ar',
  'child_first_name_fr',
  'child_last_name_fr',
  'child_name',
  'student_name',
  'guardian_phone',
  'guardian_whatsapp',
  'guardian_relationship',
  'relationship',
  'academic_year_id',
  'source_id',
  'requested_level_id',
] as const satisfies readonly (keyof PatchAdmissionPayload)[];

export type AdmissionLimitedPatchKey = (typeof ADMISSION_LIMITED_PATCH_KEYS)[number];

const LIMITED_KEY_SET = new Set<string>(ADMISSION_LIMITED_PATCH_KEYS);

function patchValueFingerprint(value: unknown): string {
  if (value === undefined) return '';
  if (Array.isArray(value)) return siblingLinesFingerprint(value as never);
  return JSON.stringify(value);
}

export function filterLimitedPatchPayload(payload: PatchAdmissionPayload): PatchAdmissionPayload {
  const out: PatchAdmissionPayload = {};
  for (const key of ADMISSION_LIMITED_PATCH_KEYS) {
    const value = payload[key];
    if (value === undefined) continue;
    if (typeof value === 'string' && !value.trim()) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    (out as Record<AdmissionLimitedPatchKey, PatchAdmissionPayload[AdmissionLimitedPatchKey]>)[key] =
      value;
  }
  return out;
}

export function diffLimitedPatchPayload(
  current: PatchAdmissionPayload,
  baseline: PatchAdmissionPayload,
): PatchAdmissionPayload {
  const out: PatchAdmissionPayload = {};
  for (const key of ADMISSION_LIMITED_PATCH_KEYS) {
    const nextValue = current[key];
    const prevValue = baseline[key];
    if (patchValueFingerprint(nextValue) === patchValueFingerprint(prevValue)) continue;
    if (nextValue === undefined) continue;
    if (typeof nextValue === 'string' && !nextValue.trim()) continue;
    if (Array.isArray(nextValue) && nextValue.length === 0) continue;
    (out as Record<AdmissionLimitedPatchKey, PatchAdmissionPayload[AdmissionLimitedPatchKey]>)[key] =
      nextValue;
  }
  return out;
}

export function isAllowedLimitedPatchKey(key: string): key is AdmissionLimitedPatchKey {
  return LIMITED_KEY_SET.has(key);
}
