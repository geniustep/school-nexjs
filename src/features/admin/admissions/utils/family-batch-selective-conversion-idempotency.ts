/** Idempotency for selective family-batch convert-to-students (UI attempt scope). */

export function createFamilyBatchConvertIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fam-conv-${crypto.randomUUID()}`;
  }
  return `fam-conv-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Stable fingerprint for selected application ids (sorted, no PII). */
export function fingerprintConvertApplicationIds(applicationIds: Iterable<number>): string {
  const unique = new Set<number>();
  for (const id of applicationIds) {
    if (typeof id === 'number' && Number.isFinite(id) && id > 0) unique.add(id);
  }
  return [...unique].sort((a, b) => a - b).join(',');
}

export function sortConvertApplicationIds(applicationIds: Iterable<number>): number[] {
  const unique = new Set<number>();
  for (const id of applicationIds) {
    if (typeof id === 'number' && Number.isFinite(id) && id > 0) unique.add(id);
  }
  return [...unique].sort((a, b) => a - b);
}

/**
 * One logical conversion attempt.
 * - Same selection → same key (retry / double-submit / network uncertainty).
 * - Selection change after reset → new key.
 * - Never derived from child names or personal data.
 */
export class FamilyBatchConvertIdempotencySession {
  private key: string | null = null;
  private fingerprint: string | null = null;

  ensureKey(applicationIds: Iterable<number>): string {
    const fp = fingerprintConvertApplicationIds(applicationIds);
    if (!fp) {
      throw new Error('application_ids_required');
    }
    if (this.key && this.fingerprint === fp) return this.key;
    this.key = createFamilyBatchConvertIdempotencyKey();
    this.fingerprint = fp;
    return this.key;
  }

  currentKey(): string | null {
    return this.key;
  }

  currentFingerprint(): string | null {
    return this.fingerprint;
  }

  /** Clear after a terminal attempt so the next selection starts fresh. */
  reset(): void {
    this.key = null;
    this.fingerprint = null;
  }
}
