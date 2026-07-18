/**
 * Typed parser for /admin/channels/compose?studentId=<id>
 * Frontend query key: studentId. Backend query key: student_id.
 */

export type ParseChannelComposeStudentIdResult =
  | { ok: true; studentId: number }
  | { ok: false; reason: 'missing' | 'invalid' | 'conflicting' };

function parseStrictPositiveInt(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Reads studentId from URLSearchParams.
 * Only the canonical frontend key `studentId` is accepted (no aliases).
 */
export function parseChannelComposeStudentId(
  params: Pick<URLSearchParams, 'get' | 'getAll'>,
): ParseChannelComposeStudentIdResult {
  const all = params.getAll('studentId');
  if (all.length === 0) return { ok: false, reason: 'missing' };

  if (all.length > 1) {
    const unique = new Set(all.map((v) => v.trim()));
    if (unique.size > 1) return { ok: false, reason: 'conflicting' };
  }

  const raw = all[0].trim();
  if (!raw) return { ok: false, reason: 'missing' };

  const studentId = parseStrictPositiveInt(raw);
  if (studentId == null) return { ok: false, reason: 'invalid' };

  return { ok: true, studentId };
}

export function channelComposeHref(studentId: number): string {
  return `/admin/channels/compose?studentId=${studentId}`;
}
