export function createLibraryImportIdempotencyKey(
  randomUUID?: () => string,
): string {
  const uuid = randomUUID
    ? randomUUID()
    : globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `nextjs-library-import-${uuid}`;
}
