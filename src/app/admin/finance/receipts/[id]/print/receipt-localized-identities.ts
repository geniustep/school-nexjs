'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FinanceReceipt } from '@/types/finance';
import {
  readCurrentEntityName,
  readFrenchStoredName,
} from './receipt-french-name-reader';

export { readCurrentEntityName, readFrenchStoredName } from './receipt-french-name-reader';

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

function positiveId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);
  add(raw.student_id);
  add(asRecord(raw.student).id);
  add(snapshot.student_id);
  add(asRecord(snapshot.student).id);

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
 * Keep guardian ids and billing partner ids in separate namespaces. A partner id
 * must never be sent directly to /admin/parents/{id}.
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
    addGuardian(asRecord(record.guardian_profile).guardian_id);

    addPartner(record.partner_id);
    addPartner(asRecord(record.person).partner_id);
    addPartner(asRecord(record.partner).id);
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
  return readFrenchStoredName(data) ?? readCurrentEntityName(data);
}

/**
 * Prefer an explicit stored French/Latin identity. The current exact parent detail
 * name remains a compatibility fallback when an older serializer omits that field.
 */
export function readParentFrenchName(data: unknown): string | null {
  return readFrenchStoredName(data) ?? readCurrentEntityName(data);
}

function arrayFromPayload(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const root = asRecord(data);
  for (const key of ['guardians', 'relationships', 'items', 'results', 'data']) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
    const nested = asRecord(root[key]);
    for (const nestedKey of ['guardians', 'relationships', 'items', 'results']) {
      if (Array.isArray(nested[nestedKey])) return nested[nestedKey] as unknown[];
    }
  }
  return [];
}

function guardianIdFromRecord(value: unknown): number | null {
  const record = asRecord(value);
  return (
    positiveId(record.guardian_id) ??
    positiveId(asRecord(record.guardian).id) ??
    positiveId(asRecord(record.guardian_profile).guardian_id) ??
    positiveId(asRecord(record.parent).guardian_id)
  );
}

function partnerIdFromRecord(value: unknown): number | null {
  const record = asRecord(value);
  return (
    positiveId(record.partner_id) ??
    positiveId(asRecord(record.person).partner_id) ??
    positiveId(asRecord(record.guardian).partner_id) ??
    positiveId(asRecord(record.parent).partner_id) ??
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
  // Use the exact same BFF contract as /admin/settings/school-branding first.
  try {
    const response = await fetch('/api/admin/school-branding', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const body = await response.json();
    if (response.ok && body?.success === true) {
      const name = readFrenchStoredName(body.data);
      if (name) return name;
    }
  } catch {
    // Fall through to the direct authenticated admin read contract.
  }

  try {
    const response = await api.get<unknown>(endpoints.admin.schoolBranding);
    return response.success ? readFrenchStoredName(response.data) : null;
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

  for (const guardianId of refs.guardianIds) {
    const name = await fetchParentFrenchNameByGuardianId(guardianId);
    if (name) return name;
  }

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
      // Keep receipt payer data as the final display fallback.
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
