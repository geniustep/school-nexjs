import { describe, expect, it } from 'vitest';
import {
  formatCollectionReference,
  getCollectionDistributionState,
  getCollectionPayerLabel,
  getCollectionStudentLabel,
  normalizePaymentCollection,
} from './collection-normalize';
import type { PaymentCollection } from '@/types/finance';

describe('collection normalization', () => {
  it('extracts student and payer labels from nested objects', () => {
    const coll = {
      id: 1,
      student_id: 10,
      student: { id: 10, name: 'Ali Ben', code: 'S001' },
      payer_name: 'Parent One',
      amount: 100,
      reference: 'COLL-001',
    } as PaymentCollection;

    expect(getCollectionStudentLabel(coll, 'N/A')).toBe('Ali Ben');
    expect(getCollectionPayerLabel(coll, 'N/A')).toBe('Parent One');
    expect(formatCollectionReference(coll)).toBe('COLL-001');
  });

  it('computes distribution states with decimal-safe comparison', () => {
    const none: PaymentCollection = { id: 1, amount: 100, allocations: [] };
    expect(getCollectionDistributionState(none)).toBe('unknown');

    const unallocated: PaymentCollection = {
      id: 2,
      amount: 100,
      allocations: [{ amount: 0 }],
    };
    expect(getCollectionDistributionState(unallocated)).toBe('none');

    const partial: PaymentCollection = {
      id: 3,
      amount: 100,
      allocations: [{ amount: 40 }],
    };
    expect(getCollectionDistributionState(partial)).toBe('partial');

    const full: PaymentCollection = {
      id: 4,
      amount: 100,
      allocations: [{ amount: 100 }],
    };
    expect(getCollectionDistributionState(full)).toBe('full');
  });

  it('normalizes collection view model fields', () => {
    const normalized = normalizePaymentCollection({
      id: 5,
      student: { name: 'Sara' },
      amount: 50,
      state: 'confirmed',
    } as PaymentCollection);
    expect(normalized.studentName).toBe('Sara');
    expect(normalized.status).toBe('confirmed');
    expect(normalized.amount).toBe(50);
  });
});
