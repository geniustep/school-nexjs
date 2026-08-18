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

export function createLibraryImportIdempotencyKey(
  randomUUID?: () => string,
): string {
  const uuid = randomUUID ? randomUUID() : createBrowserSessionEntropy();
  return `nextjs-library-import-${uuid}`;
}
