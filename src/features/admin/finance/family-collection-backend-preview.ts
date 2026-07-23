import { previewFamilyCollectionAllocation } from '@/features/admin/student-finance/api/family-finance-api';
import { normalizeFamilyCollectionPreviewResponse } from '@/lib/utils/normalize-family-finance';
import type { ListParams } from '@/types/api';
import type {
  FamilyCollectionAllocationInput,
  FamilyCollectionPreviewResponse,
} from '@/types/family-finance';

/**
 * Backend-authoritative allocation preview for family collection.
 * Call only on explicit review/confirm — never on amount keystrokes.
 */
export async function fetchFamilyCollectionBackendPreview(input: {
  familyId: number;
  amount: number;
  allocations: FamilyCollectionAllocationInput[];
  allocationMode?: 'leave_as_family_credit' | 'manual';
  query?: ListParams;
}): Promise<
  | { ok: true; preview: FamilyCollectionPreviewResponse }
  | { ok: false; message?: string; errors?: string[] }
> {
  const allocationMode = input.allocationMode ?? 'manual';
  const response = await previewFamilyCollectionAllocation(
    {
      family_id: input.familyId,
      amount: input.amount,
      allocation_mode: allocationMode,
      allocations: allocationMode === 'leave_as_family_credit' ? [] : input.allocations,
    },
    input.query,
  );

  if (!response.success) {
    return {
      ok: false,
      message: response.error.message?.trim() || undefined,
    };
  }

  const preview = normalizeFamilyCollectionPreviewResponse(response.data);
  if (!preview) {
    return { ok: false };
  }

  if (preview.errors.length > 0) {
    return { ok: false, errors: preview.errors };
  }

  return { ok: true, preview };
}
