import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FinanceReceipt } from '@/types/finance';

type MetaRecord = Record<string, unknown>;

export type ReceiptFrenchEntityNames = {
  schoolName?: string;
  payerName?: string;
  students: Record<number, string>;
};

function readRecord(value: unknown): MetaRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as MetaRecord)
    : {};
}

function firstString(source: MetaRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function positiveId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

function normalizeName(value: string | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

/**
 * Read a stored Latin/French display name without translating or transliterating.
 * `name_latin` is the canonical student field used by Student 360; the aliases
 * below cover the unified person and receipt snapshot shapes already in circulation.
 */
export function readStoredLatinName(value: unknown, depth = 0): string | undefined {
  if (depth > 2) return undefined;
  const source = readRecord(value);
  if (!Object.keys(source).length) return undefined;

  const direct = firstString(source, [
    'name_latin',
    'display_name_latin',
    'full_name_latin',
    'name_lat',
    'display_name_lat',
    'full_name_lat',
    'name_fr',
    'display_name_fr',
    'full_name_fr',
    'school_name_lat',
    'schoolNameLat',
  ]);
  if (direct) return direct;

  const first = firstString(source, [
    'first_name_latin',
    'first_name_lat',
    'first_name_fr',
  ]);
  const last = firstString(source, [
    'last_name_latin',
    'last_name_lat',
    'last_name_fr',
  ]);
  const fromParts = [first, last].filter(Boolean).join(' ').trim();
  if (fromParts) return fromParts;

  for (const key of ['person', 'student', 'payer', 'guardian', 'partner', 'school']) {
    const nested = readStoredLatinName(source[key], depth + 1);
    if (nested) return nested;
  }

  return undefined;
}

function addStudentIds(receipt: FinanceReceipt): number[] {
  const ids = new Set<number>();
  const add = (value: unknown) => {
    const id = positiveId(value);
    if (id) ids.add(id);
  };

  add(receipt.student_id);
  for (const id of receipt.involved_student_ids ?? []) add(id);
  for (const child of receipt.children ?? receipt.snapshot?.children ?? []) add(child.student_id);
  for (const allocation of receipt.allocations ?? receipt.snapshot?.allocations ?? []) {
    add(allocation.student_id);
  }
  return [...ids];
}

function rawChildren(source: MetaRecord): unknown[] {
  const snapshot = readRecord(source.snapshot);
  const values = [source.children, snapshot.children];
  const result: unknown[] = [];
  for (const value of values) {
    if (Array.isArray(value)) result.push(...value);
  }
  return result;
}

function seedRawStudentNames(rawReceipt: unknown, target: Record<number, string>): void {
  const raw = readRecord(rawReceipt);
  const snapshot = readRecord(raw.snapshot);
  const candidates = [...rawChildren(raw), snapshot.student, raw.student];

  for (const candidate of candidates) {
    const record = readRecord(candidate);
    const nested = readRecord(record.student);
    const id =
      positiveId(record.student_id) ??
      positiveId(record.id) ??
      positiveId(nested.id);
    if (!id || target[id]) continue;
    const name = readStoredLatinName(record) ?? readStoredLatinName(nested);
    if (name) target[id] = name;
  }
}

function rawPayerName(rawReceipt: unknown): string | undefined {
  const raw = readRecord(rawReceipt);
  const snapshot = readRecord(raw.snapshot);
  const payer = readRecord(snapshot.payer);
  return (
    firstString(raw, [
      'actual_payer_name_latin',
      'actual_payer_name_lat',
      'actual_payer_name_fr',
      'payer_name_latin',
      'payer_name_lat',
      'payer_name_fr',
      'billing_partner_name_latin',
      'billing_partner_name_lat',
      'billing_partner_name_fr',
    ]) ??
    readStoredLatinName(payer) ??
    readStoredLatinName(raw.payer)
  );
}

function rawSchoolName(rawReceipt: unknown): string | undefined {
  const raw = readRecord(rawReceipt);
  const snapshot = readRecord(raw.snapshot);
  return (
    readStoredLatinName(snapshot.school) ??
    readStoredLatinName(raw.school) ??
    firstString(raw, ['school_name_lat', 'school_name_latin', 'school_name_fr'])
  );
}

function payerCandidateIds(rawReceipt: unknown, receipt: FinanceReceipt): number[] {
  const raw = readRecord(rawReceipt);
  const snapshot = readRecord(raw.snapshot);
  const payer = readRecord(snapshot.payer);
  const rootPayer = readRecord(raw.payer);
  const ids = new Set<number>();
  const add = (value: unknown) => {
    const id = positiveId(value);
    if (id) ids.add(id);
  };

  for (const value of [
    raw.guardian_id,
    raw.payer_id,
    raw.actual_payer_id,
    raw.billing_guardian_id,
    payer.guardian_id,
    payer.id,
    rootPayer.guardian_id,
    rootPayer.id,
    receipt.billing_partner_id,
  ]) {
    add(value);
  }
  return [...ids];
}

function listFromUnknown(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const source = readRecord(value);
  for (const key of ['guardians', 'relationships', 'items', 'results', 'data']) {
    if (Array.isArray(source[key])) return source[key] as unknown[];
  }
  return [];
}

async function resolveSchoolName(rawReceipt: unknown): Promise<string | undefined> {
  const rawName = rawSchoolName(rawReceipt);
  if (rawName) return rawName;

  try {
    const response = await fetch('/api/admin/school-branding', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!response.ok) return undefined;
    const body = readRecord(await response.json());
    if (body.success !== true) return undefined;
    const data = readRecord(body.data);
    return firstString(data, ['schoolNameLat', 'school_name_lat']);
  } catch {
    return undefined;
  }
}

async function resolveStudentNames(
  receipt: FinanceReceipt,
  rawReceipt: unknown,
): Promise<Record<number, string>> {
  const names: Record<number, string> = {};
  seedRawStudentNames(rawReceipt, names);
  const missingIds = addStudentIds(receipt).filter((id) => !names[id]);

  await Promise.all(
    missingIds.map(async (id) => {
      const result = await api.get<unknown>(endpoints.admin.student(id));
      if (!result.success) return;
      const name = readStoredLatinName(result.data);
      if (name) names[id] = name;
    }),
  );

  return names;
}

async function resolvePayerName(
  receipt: FinanceReceipt,
  rawReceipt: unknown,
  studentIds: number[],
): Promise<string | undefined> {
  const rawName = rawPayerName(rawReceipt);
  if (rawName) return rawName;

  for (const id of payerCandidateIds(rawReceipt, receipt)) {
    const result = await api.get<unknown>(endpoints.admin.parent(id));
    if (!result.success) continue;
    const name = readStoredLatinName(result.data);
    if (name) return name;
  }

  // Last safe fallback: inspect the existing guardian relationship contract for
  // receipt students and match the current payer, without mutating any record.
  const currentPayer = normalizeName(
    receipt.actual_payer_name ?? receipt.payer_name ?? receipt.billing_partner_name,
  );
  for (const studentId of studentIds) {
    const result = await api.get<unknown>(endpoints.admin.studentGuardians(studentId));
    if (!result.success) continue;
    const guardians = listFromUnknown(result.data);
    for (const guardian of guardians) {
      const record = readRecord(guardian);
      const nestedGuardian = readRecord(record.guardian);
      const genericName = firstString(record, ['name', 'display_name', 'guardian_name']) ??
        firstString(nestedGuardian, ['name', 'display_name']);
      const financial =
        record.is_financial_responsible === true ||
        nestedGuardian.is_financial_responsible === true;
      const matchesCurrent = Boolean(currentPayer && normalizeName(genericName) === currentPayer);
      if (!financial && !matchesCurrent) continue;
      const latin = readStoredLatinName(record) ?? readStoredLatinName(nestedGuardian);
      if (latin) return latin;
    }
  }

  return undefined;
}

export async function loadReceiptFrenchEntityNames(
  receipt: FinanceReceipt,
  rawReceipt: unknown,
): Promise<ReceiptFrenchEntityNames> {
  const studentIds = addStudentIds(receipt);
  const [schoolName, students, payerName] = await Promise.all([
    resolveSchoolName(rawReceipt),
    resolveStudentNames(receipt, rawReceipt),
    resolvePayerName(receipt, rawReceipt, studentIds),
  ]);

  return { schoolName, payerName, students };
}
