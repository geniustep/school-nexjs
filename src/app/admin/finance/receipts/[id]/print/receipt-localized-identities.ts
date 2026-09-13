'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { unwrapStaffDetailResponse } from '@/features/admin/staff/utils/normalize-staff-center';
import type { StaffDetailEnvelope, StaffMember } from '@/types/academic-setup';
import type { FinanceReceipt } from '@/types/finance';

type RecordValue = Record<string, unknown>;

type PayerIdentityRefs = {
  guardianIds: number[];
  partnerIds: number[];
};

type SchoolFrenchIdentity = {
  schoolName: string | null;
  schoolCode: string | null;
};

type ReceiptIssuerIdentityContract = {
  issued_by_user_id?: number | null;
  issued_by_name?: string | null;
};

export type ReceiptLocalizedIdentities = {
  schoolName: string | null;
  schoolCode: string | null;
  payerName: string | null;
  issuerName: string | null;
  studentNames: Record<number, string>;
  ready: boolean;
};

const FRENCH_NAME_KEYS = [
  'schoolNameLat',
  'school_name_lat',
  'display_name_fr',
  'name_fr',
  'name_latin',
  'display_name_latin',
  'display_name_lat',
  'name_lat',
  'latin_name',
] as const;

const IDENTITY_CONTAINER_KEYS = [
  'identity',
  'person',
  'student',
  'guardian',
  'partner',
  'branding',
  'school',
  'profile',
  'guardian_profile',
] as const;

const PARENT_IDENTITY_CONTAINER_KEYS = [
  'identity',
  'person',
  'guardian',
  'partner',
  'profile',
  'guardian_profile',
] as const;

const STAFF_IDENTITY_CONTAINER_KEYS = [
  'item',
  'user',
  'staff',
  'person',
  'profile',
  'identity',
] as const;

const PARENT_SCALAR_KEYS = [
  ...FRENCH_NAME_KEYS,
  'display_name',
  'full_name',
  'name',
  'first_name_fr',
  'first_name_latin',
  'first_name_lat',
  'firstNameLatin',
  'last_name_fr',
  'last_name_latin',
  'last_name_lat',
  'lastNameLatin',
  'first_name',
  'firstName',
  'last_name',
  'lastName',
] as const;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}

function hasRecordValues(value: RecordValue): boolean {
  return Object.keys(value).length > 0;
}

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function firstString(source: RecordValue, keys: readonly string[]): string | null {
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

function identityRecords(value: unknown): RecordValue[] {
  const root = asRecord(value);
  if (!hasRecordValues(root)) return [];

  const records: RecordValue[] = [];
  const queue: Array<{ record: RecordValue; depth: number }> = [{ record: root, depth: 0 }];
  const seen = new Set<RecordValue>();

  while (queue.length) {
    const next = queue.shift();
    if (!next || seen.has(next.record)) continue;
    seen.add(next.record);
    records.push(next.record);

    if (next.depth >= 3) continue;
    for (const key of IDENTITY_CONTAINER_KEYS) {
      const nested = asRecord(next.record[key]);
      if (hasRecordValues(nested) && !seen.has(nested)) {
        queue.push({ record: nested, depth: next.depth + 1 });
      }
    }
  }

  return records;
}

function scopedIdentityRecords(
  value: unknown,
  containerKeys: readonly string[],
): RecordValue[] {
  const root = asRecord(value);
  if (!hasRecordValues(root)) return [];

  const records: RecordValue[] = [];
  const queue: Array<{ record: RecordValue; depth: number }> = [{ record: root, depth: 0 }];
  const seen = new Set<RecordValue>();

  while (queue.length) {
    const next = queue.shift();
    if (!next || seen.has(next.record)) continue;
    seen.add(next.record);
    records.push(next.record);

    if (next.depth >= 3) continue;
    for (const key of containerKeys) {
      const nested = asRecord(next.record[key]);
      if (hasRecordValues(nested) && !seen.has(nested)) {
        queue.push({ record: nested, depth: next.depth + 1 });
      }
    }
  }

  return records;
}

function parentIdentityView(value: unknown, depth = 0): RecordValue {
  const source = asRecord(value);
  if (!hasRecordValues(source)) return {};

  const view: RecordValue = {};
  for (const key of PARENT_SCALAR_KEYS) {
    if (key in source) view[key] = source[key];
  }

  if (depth >= 3) return view;
  for (const key of PARENT_IDENTITY_CONTAINER_KEYS) {
    const nested = parentIdentityView(source[key], depth + 1);
    if (hasRecordValues(nested)) view[key] = nested;
  }
  return view;
}

export function readFrenchStoredName(value: unknown): string | null {
  for (const candidate of identityRecords(value)) {
    const direct = firstString(candidate, FRENCH_NAME_KEYS);
    if (direct) return direct;
    const composed = composedLatinName(candidate);
    if (composed) return composed;
  }
  return null;
}

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
    const name = readParentFrenchName(candidate);
    if (name) return name;
  }
  return null;
}

function readInitialIssuerName(receipt: FinanceReceipt, rawReceipt: unknown): string | null {
  const receiptContract = receipt as FinanceReceipt & ReceiptIssuerIdentityContract;
  const raw = asRecord(rawReceipt);
  return (
    readStaffFrenchName(raw.issued_by) ??
    readStaffFrenchName(receipt.issued_by) ??
    cleanString(receiptContract.issued_by_name) ??
    cleanString(raw.issued_by_name)
  );
}

function readInitialSchoolName(rawReceipt: unknown): string | null {
  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);
  return readFrenchStoredName(snapshot.school) ?? readFrenchStoredName(raw.school);
}

function readSchoolCode(value: unknown): string | null {
  for (const candidate of identityRecords(value)) {
    const code = firstString(candidate, ['schoolCode', 'school_code', 'code']);
    if (code) return code;
  }
  return null;
}

function readInitialSchoolCode(rawReceipt: unknown): string | null {
  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);
  return readSchoolCode(snapshot.school) ?? readSchoolCode(raw.school);
}

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

export function receiptIssuerUserId(
  receipt: FinanceReceipt,
  rawReceipt: unknown,
): number | null {
  const receiptContract = receipt as FinanceReceipt & ReceiptIssuerIdentityContract;
  const raw = asRecord(rawReceipt);

  const stableUserId =
    positiveId(receiptContract.issued_by_user_id) ?? positiveId(raw.issued_by_user_id);
  if (stableUserId) return stableUserId;

  // Compatibility only for historical payloads. The governed current contract is
  // the top-level issued_by_user_id from school.payment.receipt.issued_by.
  for (const candidate of [receipt.issued_by, raw.issued_by]) {
    const record = asRecord(candidate);
    const id = positiveId(record.user_id) ?? positiveId(record.id);
    if (id) return id;
  }
  return null;
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

export function readParentFrenchName(rawData: unknown): string | null {
  const data = parentIdentityView(rawData);
  for (const candidate of identityRecords(data)) {
    const canonical = firstString(candidate, ['name_fr']);
    if (canonical) return canonical;
  }
  return readFrenchStoredName(data) ?? readCurrentEntityName(data);
}

export function readStaffFrenchName(rawData: unknown): string | null {
  const records = scopedIdentityRecords(rawData, STAFF_IDENTITY_CONTAINER_KEYS);
  for (const candidate of records) {
    const canonical = firstString(candidate, ['name_fr']);
    if (canonical) return canonical;
  }
  for (const candidate of records) {
    const stored = readFrenchStoredName(candidate);
    if (stored) return stored;
  }
  for (const candidate of records) {
    const current = readCurrentEntityName(candidate);
    if (current) return current;
  }
  return null;
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

let schoolFrenchIdentityInFlight: Promise<SchoolFrenchIdentity> | null = null;

function fetchSchoolFrenchIdentity(): Promise<SchoolFrenchIdentity> {
  if (schoolFrenchIdentityInFlight) return schoolFrenchIdentityInFlight;

  schoolFrenchIdentityInFlight = (async () => {
    try {
      const response = await fetch('/api/admin/school-branding', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok || body?.success !== true) {
        return { schoolName: null, schoolCode: null };
      }
      return {
        schoolName: readFrenchStoredName(body.data) ?? readFrenchStoredName(body),
        schoolCode: readSchoolCode(body.data) ?? readSchoolCode(body),
      };
    } catch {
      return { schoolName: null, schoolCode: null };
    }
  })().finally(() => {
    schoolFrenchIdentityInFlight = null;
  });

  return schoolFrenchIdentityInFlight;
}

async function fetchSchoolFrenchName(): Promise<string | null> {
  return (await fetchSchoolFrenchIdentity()).schoolName;
}

async function fetchSchoolCode(): Promise<string | null> {
  return (await fetchSchoolFrenchIdentity()).schoolCode;
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

async function fetchIssuerFrenchName(
  receipt: FinanceReceipt,
  rawReceipt: unknown,
): Promise<string | null> {
  const userId = receiptIssuerUserId(receipt, rawReceipt);
  if (!userId) return null;
  try {
    const response = await api.get<StaffDetailEnvelope | StaffMember>(
      endpoints.admin.staffMember(userId),
    );
    if (!response.success || !response.data) return null;
    const { member } = unwrapStaffDetailResponse(response.data);
    return cleanString(member.name_fr) ?? readStaffFrenchName(member);
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

      // The relationship payload can carry only a current/full display name.
      // Once the exact guardian is known, always read the canonical parent
      // detail first so school.parent.name_fr wins when it is populated.
      const guardianId = guardianIdFromRecord(matched);
      if (guardianId) {
        const name = await fetchParentFrenchNameByGuardianId(guardianId);
        if (name) return name;
      }

      const inlineName = readParentFrenchName(matched);
      if (inlineName) return inlineName;
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
      return {
        schoolName: null,
        schoolCode: null,
        payerName: null,
        issuerName: null,
        studentNames: {},
        ready: !enabled,
      };
    }
    return {
      schoolName: readInitialSchoolName(rawReceipt),
      schoolCode: readInitialSchoolCode(rawReceipt),
      payerName: readInitialPayerName(receipt, rawReceipt),
      issuerName: readInitialIssuerName(receipt, rawReceipt),
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
      const [freshSchoolName, freshSchoolCode, freshPayerName, freshIssuerName, studentPairs] =
        await Promise.all([
          fetchSchoolFrenchName(),
          fetchSchoolCode(),
          fetchPayerFrenchName(receipt, rawReceipt, studentIds),
          fetchIssuerFrenchName(receipt, rawReceipt),
          Promise.all(
            studentIds.map(async (studentId) => {
              const freshName = await fetchStudentFrenchName(studentId);
              return [studentId, freshName ?? initial.studentNames[studentId] ?? null] as const;
            }),
          ),
        ]);

      if (!active) return;
      const studentNames = { ...initial.studentNames };
      for (const [studentId, name] of studentPairs) {
        if (name) studentNames[studentId] = name;
      }
      setState({
        schoolName: freshSchoolName ?? initial.schoolName,
        schoolCode: freshSchoolCode ?? initial.schoolCode,
        payerName: freshPayerName ?? initial.payerName,
        issuerName: freshIssuerName ?? initial.issuerName,
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