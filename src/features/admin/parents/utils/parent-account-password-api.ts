import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ParentAccountInfo } from '@/types/parent';

export interface AssignParentAccountPasswordPayload {
  password: string;
  password_confirm: string;
}

export interface AssignParentAccountPasswordResponse {
  account?: ParentAccountInfo | null;
}

export async function assignParentAccountPassword(
  parentId: number,
  payload: AssignParentAccountPasswordPayload,
) {
  return api.post<AssignParentAccountPasswordResponse>(
    endpoints.admin.parentAccount(parentId),
    payload,
  );
}
