export function createFamilyAdmissionIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fam-adm-${crypto.randomUUID()}`;
  }
  return `fam-adm-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export class FamilyAdmissionIdempotencySession {
  private key: string | null = null;

  ensureKey(): string {
    if (!this.key) {
      this.key = createFamilyAdmissionIdempotencyKey();
    }
    return this.key;
  }

  currentKey(): string | null {
    return this.key;
  }

  reset(): void {
    this.key = null;
  }
}
