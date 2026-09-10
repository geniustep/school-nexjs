'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ReceiptHtmlPrintLang } from '@/lib/utils/finance-receipt-html-print';
import type { FinanceReceipt } from '@/types/finance';

type UnknownRecord = Record<string, unknown>;

type GuardianRef = {
  guardianId: number;
  partnerId: number;
};

export type ReceiptFrenchEntityNames = {
  loading: boolean;
  schoolName?: string;
  payerName?: string;
  studentNames: Record<number, string>;
};

const EMPTY_NAMES: ReceiptFrenchEntityNames = {
  loading: false,
  studentNames: {},
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function trimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function positiveInt(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function firstString(record: UnknownRecord | null, keys: string[]): string | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = trimmedString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function firstPositiveInt(record: UnknownRecord | null, keys: string[]): number | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    const value = positiveInt(record[key]);
    if (value) return value;
  }
  return undefined;
}

function frenchPair(record: UnknownRecord | null): string | undefined {
  if (!record) return undefined;
  const first = firstString(record, ['first_name_fr', 'firstNameFr']);
  const last = firstString(record, ['last_name_fr', 'lastNameFr']);
  const pair = [first, last].filter(Boolean).join(' ').trim();
  return pair || undefined;
}

export function extractSchoolFrenchName(data: unknown): string | undefined {
  const root = asRecord(data);
  const branding = asRecord(root?.branding);
  return (
    firstString(branding, ['school_name_lat', 'schoolNameLat']) ??
    firstString(root, ['school_name_lat', 'schoolNameLat'])
  );
}

export function extractParentFrenchName(data: unknown): string | undefined {
  const root = asRecord(data);
  const person = asRecord(root?.person);
  return (
    firstString(root, ['name_fr', 'display_name_fr']) ??
    firstString(person, ['name_fr', 'display_name_fr']) ??
    frenchPair(root) ??
    frenchPair(person)
  );
}

export function extractStudentFrenchContext(data: unknown): {
  studentId?: number;
  studentName?: string;
  guardians: GuardianRef[];
} {
  const root = asRecord(data);
  const student = asRecord(root?.student) ?? root;
  const studentId = firstPositiveInt(student, ['id', 'student_id']);
  const studentName =
    firstString(student, ['name_latin', 'name_fr', 'display_name_fr']) ?? frenchPair(student);

  const relationships = Array.isArray(root?.guardian_relationships)
    ? root.guardian_relationships
    : [];
  const guardians: GuardianRef[] = [];
  const seen = new Set<string>();

  for (const value of relationships) {
    const relationship = asRecord(value);
    const guardian = asRecord(relationship?.guardian) ?? relationship;
    const guardianId = firstPositiveInt(guardian, ['guardian_id', 'id']);
    const partnerId = firstPositiveInt(guardian, ['partner_id']);
    if (!guardianId || !partnerId) continue;
    const key = `${guardianId}:${partnerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    guardians.push({ guardianId, partnerId });
  }

  return { studentId, studentName, guardians };
}

export function receiptFrenchLookupIdentity(receipt: FinanceReceipt | null): {
  studentIds: number[];
  billingPartnerId?: number;
} {
  if (!receipt) return { studentIds: [] };
  const raw = asRecord(receipt);
  const snapshot = asRecord(raw?.snapshot);
  const snapshotStudent = asRecord(snapshot?.student);
  const snapshotPayer = asRecord(snapshot?.payer);
  const ids = new Set<number>();

  const addId = (value: unknown) => {
    const id = positiveInt(value);
    if (id) ids.add(id);
  };

  addId(raw?.student_id);
  addId(snapshotStudent?.id);

  const childSources = [raw?.children, snapshot?.children];
  for (const source of childSources) {
    if (!Array.isArray(source)) continue;
    for (const childValue of source) {
      const child = asRecord(childValue);
      addId(child?.student_id);
      addId(child?.id);
    }
  }

  const allocationSources = [raw?.allocations, snapshot?.allocations];
  for (const source of allocationSources) {
    if (!Array.isArray(source)) continue;
    for (const allocationValue of source) {
      addId(asRecord(allocationValue)?.student_id);
    }
  }

  const billingPartnerId =
    firstPositiveInt(raw, ['billing_partner_id']) ??
    firstPositiveInt(snapshotPayer, ['billing_partner_id', 'id']);

  return { studentIds: [...ids], billingPartnerId };
}

export function useReceiptFrenchEntityNames(
  receipt: FinanceReceipt | null,
  lang: ReceiptHtmlPrintLang,
): ReceiptFrenchEntityNames {
  const { activeSchoolId } = useAdminSession();
  const lookup = useMemo(() => receiptFrenchLookupIdentity(receipt), [receipt]);
  const studentIdKey = lookup.studentIds.join(',');
  const [state, setState] = useState<ReceiptFrenchEntityNames>(EMPTY_NAMES);

  useEffect(() => {
    if (lang !== 'fr' || !receipt || !activeSchoolId) {
      setState(EMPTY_NAMES);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true }));

    void (async () => {
      const query = { active_school_id: activeSchoolId };
      const brandingPromise = api.get<unknown>(
        endpoints.admin.schoolBranding,
        query,
        { signal: controller.signal },
      );
      const studentPromises = lookup.studentIds.map((studentId) =>
        api.get<unknown>(endpoints.admin.student(studentId), query, {
          signal: controller.signal,
        }),
      );

      const [brandingResult, studentResults] = await Promise.all([
        brandingPromise,
        Promise.all(studentPromises),
      ]);
      if (!active) return;

      const schoolName = brandingResult.success
        ? extractSchoolFrenchName(brandingResult.data)
        : undefined;
      const studentNames: Record<number, string> = {};
      const guardianRefs: GuardianRef[] = [];

      for (const result of studentResults) {
        if (!result.success) continue;
        const context = extractStudentFrenchContext(result.data);
        if (context.studentId && context.studentName) {
          studentNames[context.studentId] = context.studentName;
        }
        guardianRefs.push(...context.guardians);
      }

      const payerGuardian = lookup.billingPartnerId
        ? guardianRefs.find((guardian) => guardian.partnerId === lookup.billingPartnerId)
        : undefined;
      let payerName: string | undefined;
      if (payerGuardian) {
        const parentResult = await api.get<unknown>(
          endpoints.admin.parent(payerGuardian.guardianId),
          query,
          { signal: controller.signal },
        );
        if (!active) return;
        if (parentResult.success) payerName = extractParentFrenchName(parentResult.data);
      }

      setState({
        loading: false,
        schoolName,
        payerName,
        studentNames,
      });
    })().catch((error: unknown) => {
      if (!active || controller.signal.aborted) return;
      // Localized display enrichment is optional: preserve immutable receipt names on failure.
      console.warn('French receipt entity-name enrichment failed.', error);
      setState(EMPTY_NAMES);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    activeSchoolId,
    lang,
    lookup.billingPartnerId,
    receipt,
    studentIdKey,
  ]);

  return state;
}
