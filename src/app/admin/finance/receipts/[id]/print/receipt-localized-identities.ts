'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FinanceReceipt } from '@/types/finance';

type RecordValue = Record<string, unknown>;

type PayerIdentityRefs = {
  guardianIds: number[];
  partnerIds: number[];
};

export type ReceiptLocalizedIdentities = {
  schoolName: string | null;
  payerName: string | null;
  studentNames: Record<number, string>;
  ready: boolean;
};

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

function positiveId(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function composedLatinName(source: RecordValue): string | null {
  const first = firstString(source, [
    'first_name_fr',
    'first_name_latin',
    'first_name_lat',
    'firstNameLatin',
  ]);
  const last = firstString(source, [
    'last_name_fr',
    'last_name_latin',
    'last_name_lat',
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
 * Read a stored Latin/French display value only. This never translates names and
 * deliberately never falls back to the generic current display name.
 */
export function readFrenchStoredName(value: unknown): string | null {
  const source = asRecord(value);
  const person = asRecord(source.person);
  const student = asRecord(source.student);
  const guardian = asRecord(source.guardian);
  const partner = asRecord(source.partner);

  const keys = [
    'schoolNameLat',
    'school_name_lat',
    'display_name_fr',
    'name_fr',
    'name_latin',
    'display_name_latin',
    'display_name_lat',
    'name_lat',
    'latin_name',
  ];

  for (const candidate of [source, person, student, guardian, partner]) {
    const direct = firstString(candidate, keys);
    if (direct) return direct;
    const composed = composedLatinName(candidate);
    if (composed) return composed;
  }
  return null;
}

/**
 * Exact entity detail endpoints expose the entity's current operational name even
 * when their serializer does not repeat name_latin/name_fr. Odoo's bilingual name
 * write contract makes that operational name the French/Latin name when one is
 * stored. Use it only after the explicit French fields above, and only on fresh
 * entity reads — never on the historical receipt snapshot.
 */
export function readCurrentEntityName(value: unknown): string | null {
  const source = asRecord(value);
  const person = asRecord(source.person);
  const student = asRecord(source.student);
  const guardian = asRecord(source.guardian);
  const partner = asRecord(source.partner);

  for (const candidate of [source, person, student, guardian, partner]) {
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

function recordId(value: unknown): number | null {
  const source = asRecord(value);
  return positiveId(source.student_id) ?? positiveId(source.id);
}

function collectRawChildren(rawReceipt: unknown): unknown[] {
  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);
  const directChildren = Array.isArray(raw.children) ? raw.children : [];
  const snapshotChildren = Array.isArray(snapshot.children) ? snapshot.children : [];
  return [...directChildren, ...snapshotChildren];
}

export function collectReceiptStudentIds(receipt: FinanceReceipt, rawReceipt?: unknown): number[] {
  const ids = new Set<number>();
  const add = (candidate: unknown) => {
    const id = positiveId(candidate);
    if (id) ids.add(id);
  };

  add(receipt.student_id);
  for (const id of receipt.involved_student_ids ?? []) add(id);
  for (const child of receipt.children ?? receipt.snapshot?.children ?? []) add(child.student_id);
  for (const allocation of receipt.allocations ?? receipt.snapshot?.allocations ?? []) add(allocation.student_id);
  for (const child of collectRawChildren(rawReceipt)) add(recordId(child));

  return [...ids];
}

function readInitialStudentNames(rawReceipt: unknown): Record<number, string> {
  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);
  const names: Record<number, string> = {};

  const candidates = [raw.student, snapshot.student, ...collectRawChildren(rawReceipt)];
  for (const candidate of candidates) {
    const id = recordId(candidate);
    const name = readFrenchStoredName(candidate);
    if (id && name) names[id] = name;
  }

  return names;
}

function receiptPayerRecords(receipt: FinanceReceipt, rawReceipt: unknown): unknown[] {
  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);
  return [
    raw.payer,
    raw.guardian,
    snapshot.payer,
    snapshot.guardian,
    receipt.payer,
    receipt.snapshot?.payer,
  ];
}

function readInitialPayerName(receipt: FinanceReceipt, rawReceipt: unknown): string | null {
  for (const candidate of receiptPayerRecords(receipt, rawReceipt)) {
    const name = readFrenchStoredName(candidate);
    if (name) return name;
  }
  return null;
}

function readInitialSchoolName(rawReceipt: unknown): string | null {
  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);
  return readFrenchStoredName(snapshot.school) ?? readFrenchStoredName(raw.school);
}

/**
 * Keep ID namespaces explicit. `/admin/parents/{id}` accepts a guardian/parent
 * record id; a billing_partner_id/person_id must never be sent to it directly.
 */
export function payerIdentityRefs(receipt: FinanceReceipt, rawReceipt: unknown): PayerIdentityRefs {
  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);
  const guardianIds = new Set<number>();
  const partnerIds = new Set<number>();

  const addGuardian = (candidate: unknown) => {
    const id = positiveId(candidate);
    if (id) guardianIds.add(id);
  };
  const addPartner = (candidate: unknown) => {
    const id = positiveId(candidate);
    if (id) partnerIds.add(id);
  };

  addGuardian(raw.guardian_id);
  addGuardian(raw.payer_guardian_id);
  addGuardian(snapshot.guardian_id);
  addGuardian(snapshot.payer_guardian_id);

  for (const payer of receiptPayerRecords(receipt, rawReceipt)) {
    const record = asRecord(payer);
    addGuardian(record.guardian_id);
    addGuardian(asRecord(record.guardian).id);

    // `payer.id` in finance contracts is a billing partner/ref unless an
    // explicit guardian_id accompanies it, so treat it as partner namespace.
    addPartner(record.partner_id);
    addPartner(asRecord(record.person).partner_id);
    addPartner(record.id);
  }

  addPartner(receipt.billing_partner_id);
  addPartner(raw.billing_partner_id);
  addPartner(snapshot.billing_partner_id);
  addPartner(raw.actual_payer_partner_id);
  addPartner(snapshot.actual_payer_partner_id);

  return { guardianIds: [...guardianIds], partnerIds: [...partnerIds] };
}

export function readStudentFrenchName(data: unknown): string | null {
  const root = asRecord(data);
  return (
    readFrenchStoredName(root.student) ??
    readFrenchStoredName(root) ??
    readCurrentEntityName(root.student) ??
    readCurrentEntityName(root)
  );
}

/**
 * Prefer explicit name_fr. If the parent serializer omits it, the exact current
 * parent/person detail name is the authoritative fallback before the old receipt
 * snapshot name.
 */
export function readParentFrenchName(data: unknown): string | null {
  return readFrenchStoredName(data) ?? readCurrentEntityName(data);
}

function arrayFromPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const root = asRecord(data);
  for (const key of ['guardians', 'relationships', 'items', 'results', 'data']) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }
  return [];
}

function guardianIdFromRecord(value: unknown): number | null {
  const record = asRecord(value);
  return (
    positiveId(record.guardian_id) ??
    positiveId(asRecord(record.guardian).id) ??
    positiveId(asRecord(record.guardian_profile).guardian_id)
  );
}

function partnerIdFromRecord(value: unknown): number | null {
  const record = asRecord(value);
  return (
    positiveId(record.partner_id) ??
    positiveId(asRecord(record.person).partner_id) ??
    positiveId(asRecord(record.guardian).partner_id) ??
    positiveId(asRecord(record.partner).id)
  );
}

function matchingGuardianRecord(
  data: unknown,
  guardianIds: Set<number>,
  partnerIds: Set<number>,
): unknown | null {
  for (const candidate of arrayFromPayload(data)) {
    const guardianId = guardianIdFromRecord(candidate);
    const partnerId = partnerIdFromRecord(candidate);
    if (
      (guardianId != null && guardianIds.has(guardianId)) ||
      (partnerId != null && partnerIds.has(partnerId))
    ) {
      return candidate;
    }
  }
  return null;
}

async function fetchSchoolFrenchName(): Promise<string | null> {
  try {
    const response = await fetch('/api/admin/school-branding', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const body = await response.json();
    if (!response.ok || body?.success !== true) return null;
    return readFrenchStoredName(body.data);
  } catch {
    return null;
  }
}

async function fetchStudentFrenchName(studentId: number): Promise<string | null> {
  const paths = [endpoints.admin.student(studentId), endpoints.admin.studentOverview(studentId)];
  for (const path of paths) {
    try {
      const response = await api.get<unknown>(path);
      if (!response.success) continue;
      const name = readStudentFrenchName(response.data);
      if (name) return name;
    } catch {
      // Try the next exact student read contract.
    }
  }
  return null;
}

async function fetchParentFrenchNameByGuardianId(guardianId: number): Promise<string | null> {
  try {
    const response = await api.get<unknown>(endpoints.admin.parent(guardianId));
    return response.success ? readParentFrenchName(response.data) : null;
  } catch {
    return null;
  }
}

async function fetchPayerFrenchName(
  receipt: FinanceReceipt,
  rawReceipt: unknown,
  studentIds: number[],
): Promise<string | null> {
  const refs = payerIdentityRefs(receipt, rawReceipt);
  const guardianIds = new Set(refs.guardianIds);
  const partnerIds = new Set(refs.partnerIds);

  // Exact guardian ids are safe for the parent detail route.
  for (const guardianId of refs.guardianIds) {
    const name = await fetchParentFrenchNameByGuardianId(guardianId);
    if (name) return name;
  }

  // billing_partner_id is a partner namespace. Resolve it through the same
  // student's guardian relationship contract before calling /admin/parents/{id}.
  if (!guardianIds.size && !partnerIds.size) return null;
  for (const studentId of studentIds) {
    try {
      const response = await api.get<unknown>(endpoints.admin.studentGuardians(studentId));
      if (!response.success) continue;
      const matched = matchingGuardianRecord(response.data, guardianIds, partnerIds);
      if (!matched) continue;

      const inlineName = readParentFrenchName(matched);
      if (inlineName) return inlineName;

      const guardianId = guardianIdFromRecord(matched);
      if (!guardianId) continue;
      const name = await fetchParentFrenchNameByGuardianId(guardianId);
      if (name) return name;
    } catch {
      // Keep the receipt's original payer name as the display fallback.
    }
  }
  return null;
}

export function useReceiptFrenchIdentities(
  receipt: FinanceReceipt | null,
  rawReceipt: unknown,
  enabled: boolean,
): ReceiptLocalizedIdentities {
  const initial = useMemo<ReceiptLocalizedIdentities>(() => {
    if (!receipt) {
      return { schoolName: null, payerName: null, studentNames: {}, ready: !enabled };
    }
    return {
      schoolName: readInitialSchoolName(rawReceipt),
      payerName: readInitialPayerName(receipt, rawReceipt),
      studentNames: readInitialStudentNames(rawReceipt),
      ready: !enabled,
    };
  }, [receipt, rawReceipt, enabled]);

  const [state, setState] = useState<ReceiptLocalizedIdentities>(initial);

  useEffect(() => {
    if (!receipt || !enabled) {
      setState({ ...initial, ready: true });
      return;
    }

    let active = true;
    setState({ ...initial, ready: false });

    void (async () => {
      const studentIds = collectReceiptStudentIds(receipt, rawReceipt);
      const [schoolName, payerName, studentPairs] = await Promise.all([
        initial.schoolName ? Promise.resolve(initial.schoolName) : fetchSchoolFrenchName(),
        initial.payerName
          ? Promise.resolve(initial.payerName)
          : fetchPayerFrenchName(receipt, rawReceipt, studentIds),
        Promise.all(
          studentIds.map(async (studentId) => {
            const existing = initial.studentNames[studentId];
            const name = existing ?? (await fetchStudentFrenchName(studentId));
            return [studentId, name] as const;
          }),
        ),
      ]);

      if (!active) return;
      const studentNames = { ...initial.studentNames };
      for (const [studentId, name] of studentPairs) {
        if (name) studentNames[studentId] = name;
      }
      setState({
        schoolName: schoolName ?? initial.schoolName,
        payerName: payerName ?? initial.payerName,
        studentNames,
        ready: true,
      });
    })();

    return () => {
      active = false;
    };
  }, [receipt, rawReceipt, enabled, initial]);

  return state;
}
