import type { AdmissionExistingRef } from './admission-reimport-types';

/** Odoo may return false for empty char fields. */
export function normalizeExternalReference(value: unknown): string | undefined {
  if (value === false || value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

export function admissionToExistingRef(item: {
  id: number;
  external_reference?: unknown;
  reference?: unknown;
}): AdmissionExistingRef | null {
  const external_reference = normalizeExternalReference(item.external_reference);
  if (!external_reference) return null;
  return {
    id: item.id,
    external_reference,
    reference:
      item.reference != null && item.reference !== false
        ? String(item.reference).trim() || null
        : null,
  };
}

export function buildExistingRefsFromList(
  items: Array<{ id: number; external_reference?: unknown; reference?: unknown }>,
): AdmissionExistingRef[] {
  const out: AdmissionExistingRef[] = [];
  for (const item of items) {
    const ref = admissionToExistingRef(item);
    if (ref) out.push(ref);
  }
  return out;
}
