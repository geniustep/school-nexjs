import { describe, expect, it, vi } from 'vitest';
import { fetchFamilyCollectionBackendPreview } from '@/features/admin/finance/family-collection-backend-preview';
import { parseFamilyAllocationInputs } from '@/features/admin/finance/family-collection-allocation-utils';
import { previewFamilyCollectionAllocation } from '@/features/admin/student-finance/api/family-finance-api';

vi.mock('@/features/admin/student-finance/api/family-finance-api', () => ({
  previewFamilyCollectionAllocation: vi.fn(async () => ({
    success: true,
    data: {
      amount: 3000,
      allocated_amount: 3000,
      unallocated_amount: 0,
      allocations: [
        {
          student_id: 10,
          student_name: 'Ayoub',
          installment_id: 1,
          service_label: 'Registration',
          allocated_amount: 2000,
        },
        {
          student_id: 11,
          student_name: 'Malak',
          installment_id: 3,
          service_label: 'Tuition',
          allocated_amount: 1000,
        },
      ],
      warnings: [],
      errors: [],
    },
  })),
}));

describe('family collection allocation mapping + backend preview', () => {
  it('maps installment inputs to allocation payload lines', () => {
    const lines = parseFamilyAllocationInputs({ 1: '2000', 3: '1000', 9: '0' });
    expect(lines).toEqual([
      { installment_id: 1, amount: 2000 },
      { installment_id: 3, amount: 1000 },
    ]);
  });

  it('returns normalized backend preview for multi-child allocation', async () => {
    const result = await fetchFamilyCollectionBackendPreview({
      familyId: 55,
      amount: 3000,
      allocations: [
        { installment_id: 1, amount: 2000 },
        { installment_id: 3, amount: 1000 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.allocated_amount).toBe(3000);
    expect(result.preview.allocations).toHaveLength(2);
    expect(result.preview.allocations[0]?.student_name).toBe('Ayoub');
    expect(result.preview.allocations[1]?.student_id).toBe(11);
    expect(previewFamilyCollectionAllocation).toHaveBeenCalledWith(
      expect.objectContaining({
        allocation_mode: 'manual',
        allocations: [
          { installment_id: 1, amount: 2000 },
          { installment_id: 3, amount: 1000 },
        ],
      }),
      undefined,
    );
  });

  it('passes leave_as_family_credit preview without inventing positive allocations', async () => {
    await fetchFamilyCollectionBackendPreview({
      familyId: 55,
      amount: 3000,
      allocations: [{ installment_id: 1, amount: 2000 }],
      allocationMode: 'leave_as_family_credit',
    });
    expect(previewFamilyCollectionAllocation).toHaveBeenCalledWith(
      expect.objectContaining({
        allocation_mode: 'leave_as_family_credit',
        allocations: [],
      }),
      undefined,
    );
  });
});
