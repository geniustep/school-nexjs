'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { normalizeParentProfile } from '@/features/admin/parents/utils/normalize-parent-profile';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { FinanceReceipt } from '@/types/finance';

type RecordValue = Record<string, unknown>;

type GuardianPartnerRef = {
  guardianId: number;
  partnerId: number;
};

type StudentFrenchIdentityContext = {
  studentId: number;
  name: string | null;
  guardians: GuardianPartnerRef[];
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

function positiveInt(value: unknown): number | null {
  const candidate = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(candidate) && candidate > 0 ? candidate : null;
}

function firstString(source: RecordValue, keys: string[]): string | null {
  for (const key of keys) {
    const value = cleanString(source[key]);
    if (value) return value;
  }
  return null;
}

function firstPositiveInt(source: RecordValue, keys: string[]): number | null {
  for (const key of keys) {
    const value = positiveInt(source[key]);
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
  return firstPositiveInt(source, ['student_id', 'id']);
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
    const id = positiveInt(candidate);
    if (id) ids.add(id);
  };

  add(receipt.student_id);
  for (const id of receipt.involved_student_ids ?? []) add(id);
  for (const child of receipt.children ?? receipt.snapshot?.children ?? []) add(child.student_id);
  for (const allocation of receipt.allocations ?? receipt.snapshot?.allocations ?? []) {
    add(allocation.student_id);
  }
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

/**
 * Receipt billing identity is a res.partner id, not a school.parent id.
 * Snapshot payer.id is intentionally accepted because Odoo freezes payer.id from
 * collection.billing_partner_id when the receipt snapshot is issued.
 */
export function receiptBillingPartnerId(
  receipt: FinanceReceipt,
  rawReceipt: unknown,
): number | null {
  const raw = asRecord(rawReceipt);
  const snapshot = asRecord(raw.snapshot);
  const rawPayer = asRecord(raw.payer);
  const snapshotPayer = asRecord(snapshot.payer);
  const normalizedPayer = asRecord(receipt.payer);
  const normalizedSnapshotPayer = asRecord(receipt.snapshot?.payer);

  return (
    positiveInt(receipt.billing_partner_id) ??
    firstPositiveInt(raw, ['billing_partner_id']) ??
    firstPositiveInt(rawPayer, ['billing_partner_id', 'partner_id']) ??
    firstPositiveInt(snapshotPayer, ['billing_partner_id', 'partner_id', 'id']) ??
    firstPositiveInt(normalizedPayer, ['billing_partner_id', 'partner_id']) ??
    firstPositiveInt(normalizedSnapshotPayer, ['billing_partner_id', 'partner_id', 'id'])
  );
}

function directPayerGuardianIds(receipt: FinanceReceipt, rawReceipt: unknown): number[] {
  const ids = new Set<number>();
  for (const payer of receiptPayerRecords(receipt, rawReceipt)) {
    const guardianId = firstPositiveInt(asRecord(payer), [
      'guardian_id',
      'school_parent_id',
      'parent_id',
    ]);
    if (guardianId) ids.add(guardianId);
  }
  return [...ids];
}

export function readGuardianPartnerRefs(data: unknown): GuardianPartnerRef[] {
  const root = asRecord(data);
  const student = asRecord(root.student);
  const relationships = Array.isArray(root.guardian_relationships)
    ? root.guardian_relationships
    : Array.isArray(student.guardian_relationships)
      ? student.guardian_relationships
      : [];
  const refs: GuardianPartnerRef[] = [];
  const seen = new Set<string>();

  for (const candidate of relationships) {
    const relationship = asRecord(candidate);
    const guardian = asRecord(relationship.guardian);
    const guardianId =
      firstPositiveInt(guardian, ['guardian_id', 'id']) ??
      firstPositiveInt(relationship, ['guardian_id']);
    const partnerId =
      firstPositiveInt(guardian, ['partner_id']) ??
      firstPositiveInt(relationship, ['partner_id']);
    if (!guardianId || !partnerId) continue;

    const key = `${guardianId}:${partnerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ guardianId, partnerId });
  }

  return refs;
}

export function resolveGuardianIdForBillingPartner(
  studentContexts: Array<Pick<StudentFrenchIdentityContext, 'guardians'>>,
  billingPartnerId: number | null,
): number | null {
  if (!billingPartnerId) return null;
  for (const context of studentContexts) {
    const match = context.guardians.find((guardian) => guardian.partnerId === billingPartnerId);
    if (match) return match.guardianId;
  }
  return null;
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

function schoolQuery(activeSchoolId: number | null): { active_school_id: number } | undefined {
  return activeSchoolId ? { active_school_id: activeSchoolId } : undefined;
}

async function fetchStudentFrenchIdentity(
  studentId: number,
  activeSchoolId: number | null,
): Promise<StudentFrenchIdentityContext> {
  try {
    const response = await api.get<unknown>(
      endpoints.admin.student(studentId),
      schoolQuery(activeSchoolId),
    );
    if (!response.success) return { studentId, name: null, guardians: [] };
    return {
      studentId,
      name: readStudentFrenchName(response.data),
      guardians: readGuardianPartnerRefs(response.data),
    };
  } catch {
    return { studentId, name: null, guardians: [] };
  }
}

async function fetchPayerFrenchName(
  guardianIds: number[],
  activeSchoolId: number | null,
): Promise<string | null> {
  for (const guardianId of guardianIds) {
    try {
      const response = await api.get<unknown>(
        endpoints.admin.parent(guardianId),
        schoolQuery(activeSchoolId),
      );
      if (!response.success) continue;
      const name = readParentFrenchName(response.data);
      if (name) return name;
    } catch {
      // Try the next exact guardian candidate; immutable receipt data remains the fallback.
    }
  }
  return null;
}

export function useReceiptFrenchIdentities(
  receipt: FinanceReceipt | null,
  rawReceipt: unknown,
  enabled: boolean,
): ReceiptLocalizedIdentities {
  const { activeSchoolId } = useAdminSession();
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
      const [schoolName, studentContexts] = await Promise.all([
        initial.schoolName ? Promise.resolve(initial.schoolName) : fetchSchoolFrenchName(),
        Promise.all(
          studentIds.map((studentId) => fetchStudentFrenchIdentity(studentId, activeSchoolId)),
        ),
      ]);

      if (!active) return;

      const studentNames = { ...initial.studentNames };
      for (const context of studentContexts) {
        const name = studentNames[context.studentId] ?? context.name;
        if (name) studentNames[context.studentId] = name;
      }

      let payerName = initial.payerName;
      if (!payerName) {
        const billingPartnerId = receiptBillingPartnerId(receipt, rawReceipt);
        const matchedGuardianId = resolveGuardianIdForBillingPartner(
          studentContexts,
          billingPartnerId,
        );
        const guardianIds = new Set<number>();
        if (matchedGuardianId) guardianIds.add(matchedGuardianId);
        for (const guardianId of directPayerGuardianIds(receipt, rawReceipt)) {
          guardianIds.add(guardianId);
        }
        payerName = await fetchPayerFrenchName([...guardianIds], activeSchoolId);
        if (!active) return;
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
  }, [receipt, rawReceipt, enabled, initial, activeSchoolId]);

  return state;
}
