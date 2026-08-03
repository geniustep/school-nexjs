/**
 * Atomic admission → student conversion helpers (School API contract).
 * Conversion truth: application_status / student_id / registration_flow_state / converted_at
 * — not legacy CRM state.
 */

export const ADMISSION_ATOMIC_CONVERSION_ERROR_CODES = [
  'guardian_selection_required',
  'admission_not_found',
  'admission_school_mismatch',
  'admission_already_converted',
  'admission_student_link_failed',
] as const;

export type AdmissionAtomicConversionErrorCode =
  (typeof ADMISSION_ATOMIC_CONVERSION_ERROR_CODES)[number];

export interface AdmissionConversionSnapshot {
  id?: number | null;
  student_id?: number | null;
  application_status?: string | null;
  registration_flow_state?: string | null;
  converted_at?: string | null;
}

export function isAdmissionAtomicConversionErrorCode(
  code: string,
): code is AdmissionAtomicConversionErrorCode {
  return (ADMISSION_ATOMIC_CONVERSION_ERROR_CODES as readonly string[]).includes(code);
}

export function isAdmissionConverted(snapshot: AdmissionConversionSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  if (snapshot.application_status === 'registered') return true;
  if (snapshot.registration_flow_state === 'linked') return true;
  if (typeof snapshot.student_id === 'number' && snapshot.student_id > 0) return true;
  if (typeof snapshot.converted_at === 'string' && snapshot.converted_at.trim()) return true;
  return false;
}

function asPositiveId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const n = Number(value.trim());
    return n > 0 ? n : null;
  }
  return null;
}

function asOptionalString(value: unknown): string | null {
  if (value == null || value === false) return null;
  const s = String(value).trim();
  return s || null;
}

export function normalizeAdmissionConversionSnapshot(
  raw: unknown,
): AdmissionConversionSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return {
    id: asPositiveId(row.id),
    student_id: asPositiveId(row.student_id),
    application_status: asOptionalString(row.application_status),
    registration_flow_state: asOptionalString(row.registration_flow_state),
    converted_at: asOptionalString(row.converted_at),
  };
}

/**
 * Extract conversion evidence from POST /admin/students success body.
 * Prefers detail.admission; falls back to top-level admission when present.
 */
export function parseAdmissionConversionFromCreateResponse(
  data: unknown,
): AdmissionConversionSnapshot | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;

  const detail = root.detail;
  if (detail && typeof detail === 'object') {
    const fromDetail = normalizeAdmissionConversionSnapshot(
      (detail as Record<string, unknown>).admission,
    );
    if (fromDetail) return fromDetail;
  }

  return normalizeAdmissionConversionSnapshot(root.admission);
}
