export type RequirementImportPreviewItem = {
  item_type?: string | null;
  name?: string | null;
  quantity?: number | null;
  subject_id?: number | null;
  teaching_offering_id?: number | null;
  isbn?: string | null;
  publisher?: string | null;
  edition?: string | null;
  importance?: string | null;
  provision_source?: string | null;
  notes?: string | null;
};

export type RequirementImportPreviewRow = {
  row_number: number;
  valid: boolean;
  item?: RequirementImportPreviewItem | null;
};

let fallbackSequence = 0;

function createBrowserSessionEntropy(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(4);
    cryptoApi.getRandomValues(values);
    return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('');
  }
  fallbackSequence += 1;
  return `${Date.now()}-${fallbackSequence}`;
}

export function createEntryRequirementImportIdempotencyKey(
  uuidFactory?: () => string,
): string {
  const uuid = uuidFactory ? uuidFactory() : createBrowserSessionEntropy();
  return `nextjs-entry-requirements-${uuid}`;
}

function normalized(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase();
}

export function previewRowIdentity(row: RequirementImportPreviewRow): string {
  const item = row.item ?? {};
  return [
    normalized(item.item_type),
    normalized(item.name),
    normalized(item.quantity),
    normalized(item.subject_id),
    normalized(item.teaching_offering_id),
    normalized(item.isbn).replace(/[\s-]+/g, ''),
    normalized(item.publisher),
    normalized(item.edition),
    normalized(item.importance),
    normalized(item.provision_source),
    normalized(item.notes),
  ].join('|');
}

export function duplicatePreviewRowNumbers(rows: readonly RequirementImportPreviewRow[]): number[] {
  const seen = new Map<string, number>();
  const duplicates = new Set<number>();
  for (const row of rows) {
    if (!row.valid) continue;
    const key = previewRowIdentity(row);
    const first = seen.get(key);
    if (first !== undefined) {
      duplicates.add(first);
      duplicates.add(row.row_number);
    } else {
      seen.set(key, row.row_number);
    }
  }
  return [...duplicates].sort((a, b) => a - b);
}
