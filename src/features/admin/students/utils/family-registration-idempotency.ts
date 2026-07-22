/** Stable idempotency keys for family multi-child batch registration (3D2). */

export function createFamilyBatchIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fam-batch-${crypto.randomUUID()}`;
  }
  return `fam-batch-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createFamilyChildIdempotencyKey(clientChildId: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fam-child-${clientChildId}-${crypto.randomUUID()}`;
  }
  return `fam-child-${clientChildId}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Holds batch + per-child keys for the lifetime of one registration draft.
 * Keys are never regenerated on re-render, step navigation, network failure,
 * or partial success. Reset only when starting an explicit new registration.
 */
export class FamilyBatchIdempotencyRegistry {
  private batchKey: string | null = null;
  private readonly childKeys = new Map<string, string>();

  ensureBatchKey(): string {
    if (!this.batchKey) {
      this.batchKey = createFamilyBatchIdempotencyKey();
    }
    return this.batchKey;
  }

  currentBatchKey(): string | null {
    return this.batchKey;
  }

  ensureChildKey(clientChildId: string): string {
    const existing = this.childKeys.get(clientChildId);
    if (existing) return existing;
    const next = createFamilyChildIdempotencyKey(clientChildId);
    this.childKeys.set(clientChildId, next);
    return next;
  }

  currentChildKey(clientChildId: string): string | null {
    return this.childKeys.get(clientChildId) ?? null;
  }

  /** Drop keys for children removed from the draft (not succeeded retries). */
  pruneChildren(activeClientChildIds: Iterable<string>): void {
    const keep = new Set(activeClientChildIds);
    for (const key of this.childKeys.keys()) {
      if (!keep.has(key)) this.childKeys.delete(key);
    }
  }

  reset(): void {
    this.batchKey = null;
    this.childKeys.clear();
  }
}
