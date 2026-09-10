'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeParentProfile } from '@/features/admin/parents/utils/normalize-parent-profile';
import type { FinanceReceipt } from '@/types/finance';

type RecordValue = Record<string, unknown>;

type PayerIdentityCandidates = {
  guardianIds: number[];
  partnerIds: number[];
  names: string[];
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
  const first = firstString(source, ['first_name_latin', 'first_name_fr', 'firstNameLatin']);
  const last = firstString(source, ['last_name_latin', 'last_name_fr', 'lastNameLatin']);
  const joined = [first, last].filter(Boolean).join(' ').trim();
  return joined || null;
}

/**
 * Read a stored Latin/French display value only. This never translates names.
 * Known canonical Raqeem fields are preferred; compatibility aliases are read-only fallbacks.
 */
export function readFrenchStoredName(value: unknown): string | null {
  const source = asRecord(value);
  const person = asRecord(source.person);
  const student = asRecord(source.student);

  const keys = [
    'schoolNameLat',
    'school_name_lat',
    'name_latin',
    'name_lat',
    'display_name_fr',
    'name_fr',
  ];

  return (
    firstString(source, keys) ??
    composedLatinName(source) ??
    firstString(person, keys) ??
    composedLatinName(person) ??
    firstString(student, keys) ??
    composedLatinName(student)
  );
}

function recordId(value: unknown): number | null {
  const source = asRecord(value);
  return positiveId(source.student_id ?? source.id);
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
  return [raw.payer, snapshot.payer, receipt.payer, receipt.snapshot?.payer];
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

function normalizedName(value: unknown): string | null {
  const name = cleanString(value);
  return name ? name.toLocaleLowerCase() : null;
}

function payerIdentityCandidates(
  receipt: FinanceReceipt,
  rawReceipt: unknown,
): PayerIdentityCandidates {
  const guardianIds = new Set<number>();
  const partnerIds = new Set<number>();
  const names = new Set<string>();
  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);

  const addGuardianId = (candidate: unknown) => {
    const id = positiveId(candidate);
    if (id) guardianIds.add(id);
  };
  const addPartnerId = (candidate: unknown) => {
    const id = positiveId(candidate);
    if (id) partnerIds.add(id);
  };
  const addName = (candidate: unknown) => {
    const name = normalizedName(candidate);
    if (name) names.add(name);
  };

  // Only explicit guardian_id values are safe to send to /admin/parents/{id}.
  // billing_partner_id / partner_id / person_id belong to res.partner identity space.
  addGuardianId(raw.guardian_id);
  addGuardianId(snapshot.guardian_id);

  for (const payer of receiptPayerRecords(receipt, rawReceipt)) {
    const record = asRecord(payer);
    addGuardianId(record.guardian_id);
    addPartnerId(record.partner_id);
    addPartnerId(record.person_id);
    // A payer snapshot id is treated as a person/partner identity unless the contract
    // explicitly names it guardian_id. This avoids /parents/{partner_id} 404s.
    addPartnerId(record.id);
    addName(record.name);
    addName(record.display_name);
  }

  addPartnerId(receipt.billing_partner_id);
  addName(receipt.actual_payer_name);
  addName(receipt.payer_name);
  addName(receipt.billing_partner_name);

  return {
    guardianIds: [...guardianIds],
    partnerIds: [...partnerIds],
    names: [...names],
  };
}

function readStudentFrenchName(data: unknown): string | null {
  const root = asRecord(data);
  return readFrenchStoredName(root.student) ?? readFrenchStoredName(root);
}

function readParentFrenchName(data: unknown): string | null {
  const explicit = readFrenchStoredName(data);
  if (explicit) return explicit;

  // Parent detail can expose only the current display_name on older tenants.
  // Keep it as a final non-translated fallback after the correct guardian id was resolved.
  return normalizeParentProfile(data)?.name?.trim() || null;
}

function guardianRelationshipItems(data: unknown): RecordValue[] {
  if (Array.isArray(data)) return data.map(asRecord).filter((item) => Object.keys(item).length > 0);
  const root = asRecord(data);
  const items = Array.isArray(root.items) ? root.items : [];
  return items.map(asRecord).filter((item) => Object.keys(item).length > 0);
}

function guardianRecord(relationship: RecordValue): RecordValue {
  const nested = asRecord(relationship.guardian);
  return Object.keys(nested).length ? nested : relationship;
}

function relationshipGuardianId(relationship: RecordValue): number | null {
  const guardian = guardianRecord(relationship);
  return (
    positiveId(guardian.guardian_id) ??
    positiveId(relationship.guardian_id) ??
    positiveId(guardian.id)
  );
}

function relationshipMatchesPayer(
  relationship: RecordValue,
  candidates: PayerIdentityCandidates,
): boolean {
  const guardian = guardianRecord(relationship);
  const guardianId = relationshipGuardianId(relationship);
  if (guardianId && candidates.guardianIds.includes(guardianId)) return true;

  const partnerCandidates = [
    guardian.partner_id,
    guardian.person_id,
    relationship.partner_id,
    relationship.person_id,
  ]
    .map(positiveId)
    .filter((id): id is number => id != null);
  if (partnerCandidates.some((id) => candidates.partnerIds.includes(id))) return true;

  const relationshipNames = [
    guardian.name,
    guardian.display_name,
    relationship.guardian_name,
    relationship.name,
  ]
    .map(normalizedName)
    .filter((name): name is string => name != null);
  return relationshipNames.some((name) => candidates.names.includes(name));
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
  try {
    const response = await api.get<unknown>(endpoints.admin.student(studentId));
    return response.success ? readStudentFrenchName(response.data) : null;
  } catch {
    return null;
  }
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
  const candidates = payerIdentityCandidates(receipt, rawReceipt);

  // Explicit guardian ids are already in the school.parent identity space.
  for (const guardianId of candidates.guardianIds) {
    const name = await fetchParentFrenchNameByGuardianId(guardianId);
    if (name) return name;
  }

  // Receipt billing_partner_id is a res.partner id, not a school.parent id.
  // Resolve partner/person -> guardian profile through the student's verified guardian contract.
  for (const studentId of studentIds) {
    try {
      const response = await api.get<unknown>(endpoints.admin.studentGuardians(studentId));
      if (!response.success) continue;
      const relationships = guardianRelationshipItems(response.data);
      const match = relationships.find((relationship) =>
        relationshipMatchesPayer(relationship, candidates),
      );
      if (!match) continue;

      const guardian = guardianRecord(match);
      const embeddedFrenchName = readFrenchStoredName(guardian);
      if (embeddedFrenchName) return embeddedFrenchName;

      const guardianId = relationshipGuardianId(match);
      if (!guardianId) continue;
      const name = await fetchParentFrenchNameByGuardianId(guardianId);
      if (name) return name;
    } catch {
      // Keep the receipt snapshot name as fallback; never guess another guardian.
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
