'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { normalizeParentProfile } from '@/features/admin/parents/utils/normalize-parent-profile';
import type { FinanceReceipt } from '@/types/finance';

type RecordValue = Record<string, unknown>;

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
  const candidate = source.student_id ?? source.id;
  return typeof candidate === 'number' && Number.isInteger(candidate) && candidate > 0
    ? candidate
    : null;
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
    if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate > 0) ids.add(candidate);
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
    snapshot.payer,
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

function payerCandidateIds(receipt: FinanceReceipt, rawReceipt: unknown): number[] {
  const ids = new Set<number>();
  const add = (candidate: unknown) => {
    if (typeof candidate === 'number' && Number.isInteger(candidate) && candidate > 0) ids.add(candidate);
  };

  for (const payer of receiptPayerRecords(receipt, rawReceipt)) {
    const record = asRecord(payer);
    add(record.id);
    add(record.guardian_id);
    add(record.person_id);
    add(record.partner_id);
  }
  add(receipt.billing_partner_id);

  return [...ids];
}

function readStudentFrenchName(data: unknown): string | null {
  const root = asRecord(data);
  return readFrenchStoredName(root.student) ?? readFrenchStoredName(root);
}

function readParentFrenchName(data: unknown): string | null {
  const explicit = readFrenchStoredName(data);
  if (explicit) return explicit;

  // /admin/parents/{id} is the same read contract used by the parent profile page.
  // Its display name is a safe final fallback when no dedicated Latin alias is exposed.
  return normalizeParentProfile(data)?.name?.trim() || null;
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

async function fetchPayerFrenchName(ids: number[]): Promise<string | null> {
  for (const id of ids) {
    try {
      const response = await api.get<unknown>(endpoints.admin.parent(id));
      if (!response.success) continue;
      const name = readParentFrenchName(response.data);
      if (name) return name;
    } catch {
      // Try the next identity candidate; receipt data remains the fallback.
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
      const payerIds = payerCandidateIds(receipt, rawReceipt);
      const [schoolName, payerName, studentPairs] = await Promise.all([
        initial.schoolName ? Promise.resolve(initial.schoolName) : fetchSchoolFrenchName(),
        initial.payerName ? Promise.resolve(initial.payerName) : fetchPayerFrenchName(payerIds),
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
