import { describe, expect, it } from 'vitest';
import type { FamilyFinanceSummary } from '@/types/family-finance';
import {
  readReceiptIdFromCollection,
  resolveRegistrationCollectionEntry,
} from './resolve-registration-collection-entry';

function summary(partial: Partial<FamilyFinanceSummary>): FamilyFinanceSummary {
  return {
    family_id: 88,
    billing_partner_id: 88,
    display_name: 'أسرة العلوي',
    student_count: 2,
    children: [
      {
        student_id: 1,
        student_name: 'يوسف',
        services_summary: [],
      },
      {
        student_id: 2,
        student_name: 'مريم',
        services_summary: [],
      },
    ],
    ...partial,
  };
}

describe('resolveRegistrationCollectionEntry', () => {
  it('routes a single succeeded student to the student drawer', () => {
    expect(
      resolveRegistrationCollectionEntry({
        succeededStudentIds: [41],
        summaryResolved: true,
      }),
    ).toEqual({ kind: 'student', studentId: 41 });
  });

  it('routes multi-child family accounts to the official family drawer once', () => {
    expect(
      resolveRegistrationCollectionEntry({
        succeededStudentIds: [41, 42],
        familySummary: summary({}),
        summaryResolved: true,
      }),
    ).toEqual({
      kind: 'family',
      familyId: 88,
      accountName: 'أسرة العلوي',
      studentId: 41,
    });
  });

  it('does not invent a family account when context is unresolved', () => {
    expect(
      resolveRegistrationCollectionEntry({
        succeededStudentIds: [41, 42],
        familySummary: null,
        summaryResolved: true,
      }),
    ).toEqual({ kind: 'unavailable', reason: 'context_unresolved' });
  });

  it('blocks collection when billing is unresolved or collection is forbidden', () => {
    expect(
      resolveRegistrationCollectionEntry({
        succeededStudentIds: [41],
        billingUnresolved: true,
      }),
    ).toEqual({ kind: 'unavailable', reason: 'billing_unresolved' });

    expect(
      resolveRegistrationCollectionEntry({
        succeededStudentIds: [41],
        collectionAllowed: false,
      }),
    ).toEqual({ kind: 'unavailable', reason: 'collection_blocked' });
  });

  it('ignores failed students by only accepting succeeded ids', () => {
    expect(
      resolveRegistrationCollectionEntry({
        succeededStudentIds: [41],
        familySummary: summary({ student_count: 1, children: [{ student_id: 41, services_summary: [] }] }),
        summaryResolved: true,
      }),
    ).toEqual({ kind: 'student', studentId: 41 });
  });

  it('reads official receipt ids only', () => {
    expect(readReceiptIdFromCollection({ receipt_id: 9, receipts: [] })).toBe(9);
    expect(readReceiptIdFromCollection({ receipts: [{ id: 11 }] })).toBe(11);
    expect(readReceiptIdFromCollection({ receipts: [] })).toBeNull();
  });
});
