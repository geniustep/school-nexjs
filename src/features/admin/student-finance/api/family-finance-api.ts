'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  FamilyCollectionContext,
  FamilyCollectionCreateRequest,
  FamilyCollectionCreateResponse,
  FamilyCollectionPreviewRequest,
  FamilyCollectionPreviewResponse,
  FamilyFinanceSummary,
  FamilyPlanContext,
} from '@/types/family-finance';

export async function getStudentFamilyFinanceSummary(
  studentId: number | string,
  query?: ListParams,
): Promise<ApiResponse<FamilyFinanceSummary>> {
  return api.get<FamilyFinanceSummary>(
    endpoints.admin.financeStudentFamilySummary(studentId),
    query,
  );
}

export async function getFamilyFinanceSummary(
  familyId: number | string,
  query?: ListParams,
): Promise<ApiResponse<FamilyFinanceSummary>> {
  return api.get<FamilyFinanceSummary>(endpoints.admin.financeFamilySummary(familyId), query);
}

export async function getStudentFamilyPlanContext(
  studentId: number | string,
  query?: ListParams,
): Promise<ApiResponse<FamilyPlanContext>> {
  return api.get<FamilyPlanContext>(
    endpoints.admin.financeStudentFamilyPlanContext(studentId),
    query,
  );
}

export async function getStudentFamilyCollectionContext(
  studentId: number | string,
  query?: ListParams,
): Promise<ApiResponse<FamilyCollectionContext>> {
  return api.get<FamilyCollectionContext>(
    endpoints.admin.financeStudentFamilyCollectionContext(studentId),
    query,
  );
}

export async function getFamilyCollectionContext(
  familyId: number | string,
  query?: ListParams,
): Promise<ApiResponse<FamilyCollectionContext>> {
  return api.get<FamilyCollectionContext>(
    endpoints.admin.financeFamilyCollectionContext(familyId),
    query,
  );
}

export async function previewFamilyCollectionAllocation(
  payload: FamilyCollectionPreviewRequest,
  query?: ListParams,
): Promise<ApiResponse<FamilyCollectionPreviewResponse>> {
  return api.post<FamilyCollectionPreviewResponse>(
    endpoints.admin.financeFamilyCollectionPreview,
    payload,
    query,
  );
}

export async function submitFamilyCollection(
  payload: FamilyCollectionCreateRequest,
  query?: ListParams,
): Promise<ApiResponse<FamilyCollectionCreateResponse>> {
  return api.post<FamilyCollectionCreateResponse>(
    endpoints.admin.financeFamilyCollections,
    payload,
    query,
  );
}
