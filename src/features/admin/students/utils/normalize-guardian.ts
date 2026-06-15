import type { GuardianQuickCreateResponse, GuardianSummary } from '@/types/student-360';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

/** Map School API guardian payload (flat or nested) to GuardianSummary. */
export function normalizeGuardianSummary(data: unknown): GuardianSummary | null {
  const raw = asRecord(data);
  if (!raw || typeof raw.id !== 'number') return null;

  const name =
    (typeof raw.name === 'string' && raw.name.trim()) ||
    (typeof raw.full_name === 'string' && raw.full_name.trim()) ||
    '';

  return {
    id: raw.id,
    name,
    phone:
      (typeof raw.phone === 'string' ? raw.phone : null) ??
      (typeof raw.mobile === 'string' ? raw.mobile : null),
    secondary_phone: typeof raw.secondary_phone === 'string' ? raw.secondary_phone : null,
    email: typeof raw.email === 'string' ? raw.email : null,
    address: typeof raw.address === 'string' ? raw.address : null,
    children_count:
      typeof raw.children_count === 'number'
        ? raw.children_count
        : typeof raw.linked_students_count === 'number'
          ? raw.linked_students_count
          : undefined,
    national_id:
      typeof raw.national_id === 'string'
        ? raw.national_id
        : typeof raw.id_number === 'string'
          ? raw.id_number
          : null,
    has_account:
      raw.has_account === true ||
      (typeof raw.user_id === 'number' && raw.user_id > 0) ||
      (asRecord(raw.account)?.user_id != null),
  };
}

/** GET list endpoints may return `{ items: GuardianSummary[] }`. */
export function normalizeGuardianList(data: unknown): GuardianSummary[] {
  if (Array.isArray(data)) {
    return data.map(normalizeGuardianSummary).filter((g): g is GuardianSummary => g != null);
  }
  const raw = asRecord(data);
  if (Array.isArray(raw?.items)) {
    return raw.items.map(normalizeGuardianSummary).filter((g): g is GuardianSummary => g != null);
  }
  return [];
}

/** POST /admin/guardians/quick-create — nested `{ guardian }` or flat guardian object. */
export function normalizeGuardianQuickCreateResponse(data: unknown): GuardianSummary | null {
  const raw = asRecord(data);
  if (!raw) return null;

  if (raw.guardian != null) {
    return normalizeGuardianSummary(raw.guardian);
  }

  return normalizeGuardianSummary(raw);
}

export function isGuardianQuickCreateResponse(data: unknown): data is GuardianQuickCreateResponse {
  return normalizeGuardianQuickCreateResponse(data) != null;
}
