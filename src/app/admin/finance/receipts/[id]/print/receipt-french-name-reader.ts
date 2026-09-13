type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstString(source: RecordValue, keys: string[]): string | null {
  for (const key of keys) {
    const value = cleanString(source[key]);
    if (value) return value;
  }
  return null;
}

const NESTED_IDENTITY_KEYS = [
  'data',
  'student',
  'parent',
  'guardian',
  'guardian_profile',
  'person',
  'partner',
  'profile',
  'record',
  'school',
  'branding',
] as const;

/**
 * Identity responses are not uniform across the admin detail contracts. Walk only
 * the known identity envelopes instead of recursively scanning arbitrary payloads.
 */
function identityRecords(value: unknown): RecordValue[] {
  const root = asRecord(value);
  if (!Object.keys(root).length) return [];

  const records: RecordValue[] = [];
  const queue: Array<{ record: RecordValue; depth: number }> = [{ record: root, depth: 0 }];
  const seen = new Set<RecordValue>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current.record)) continue;
    seen.add(current.record);
    records.push(current.record);
    if (current.depth >= 4) continue;

    for (const key of NESTED_IDENTITY_KEYS) {
      const nested = asRecord(current.record[key]);
      if (Object.keys(nested).length) {
        queue.push({ record: nested, depth: current.depth + 1 });
      }
    }
  }

  return records;
}

function composedLatinName(source: RecordValue): string | null {
  const first = firstString(source, [
    'first_name_fr',
    'first_name_latin',
    'first_name_lat',
    'firstNameFr',
    'firstNameLatin',
  ]);
  const last = firstString(source, [
    'last_name_fr',
    'last_name_latin',
    'last_name_lat',
    'lastNameFr',
    'lastNameLatin',
  ]);
  const joined = [first, last].filter(Boolean).join(' ').trim();
  return joined || null;
}

function composedCurrentName(source: RecordValue): string | null {
  const first = firstString(source, ['first_name', 'firstName']);
  const last = firstString(source, ['last_name', 'lastName']);
  const joined = [first, last].filter(Boolean).join(' ').trim();
  return joined || null;
}

/**
 * Reads only a stored French/Latin identity. It never translates or derives a
 * French value from the Arabic/current display name.
 */
export function readFrenchStoredName(value: unknown): string | null {
  const keys = [
    'schoolNameLat',
    'school_name_lat',
    'display_name_fr',
    'displayNameFr',
    'full_name_fr',
    'name_fr',
    'name_latin',
    'nameLatin',
    'full_name_latin',
    'fullNameLatin',
    'display_name_latin',
    'display_name_lat',
    'name_lat',
    'latin_name',
  ];

  for (const candidate of identityRecords(value)) {
    const direct = firstString(candidate, keys);
    if (direct) return direct;
    const composed = composedLatinName(candidate);
    if (composed) return composed;
  }
  return null;
}

/**
 * Reads the current operational entity name from an exact live detail response.
 * This is intentionally separate from readFrenchStoredName and must never be
 * applied to a historical receipt snapshot as a French translation substitute.
 */
export function readCurrentEntityName(value: unknown): string | null {
  for (const candidate of identityRecords(value)) {
    const direct = firstString(candidate, [
      'display_name',
      'full_name',
      'name',
      'student_name',
    ]);
    if (direct) return direct;
    const composed = composedCurrentName(candidate);
    if (composed) return composed;
  }
  return null;
}
