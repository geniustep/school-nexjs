// Defense-in-depth: reject JSON mutation bodies that try to switch school context.

export type ActiveSchoolBodyBindResult =
  | { ok: true; body: unknown }
  | { ok: false; reason: 'school_id_mismatch' | 'active_school_id_mismatch' };

function asFinitePositiveId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * For admin JSON mutations that may carry school_id / active_school_id at the top level:
 * reject mismatches against the trusted active school; optionally inject active_school_id.
 */
export function bindActiveSchoolJsonBody(
  body: unknown,
  activeSchoolId: number | null | undefined,
  opts?: { injectActiveSchoolId?: boolean },
): ActiveSchoolBodyBindResult {
  if (body === undefined || body === null) {
    if (opts?.injectActiveSchoolId && activeSchoolId != null) {
      return { ok: true, body: { active_school_id: activeSchoolId } };
    }
    return { ok: true, body };
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    return { ok: true, body };
  }

  const record = body as Record<string, unknown>;
  const next: Record<string, unknown> = { ...record };

  if (activeSchoolId != null) {
    const bodySchoolId = asFinitePositiveId(record.school_id);
    if (bodySchoolId != null && bodySchoolId !== activeSchoolId) {
      return { ok: false, reason: 'school_id_mismatch' };
    }

    const bodyActive = asFinitePositiveId(record.active_school_id);
    if (bodyActive != null && bodyActive !== activeSchoolId) {
      return { ok: false, reason: 'active_school_id_mismatch' };
    }

    if (opts?.injectActiveSchoolId !== false) {
      next.active_school_id = activeSchoolId;
    }
  }

  return { ok: true, body: next };
}

export function activeSchoolBodyMismatchResponse(reason: string) {
  return {
    success: false as const,
    error: {
      code: 'validation_error',
      message: 'Request school context does not match the active school.',
      details: { reason },
    },
    meta: {},
  };
}
