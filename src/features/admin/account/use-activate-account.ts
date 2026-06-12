'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { AccountMutationResponse } from '@/types/account';

export function useActivateStudentAccount() {
  return useCallback(async (studentId: number) => {
    return api.post<AccountMutationResponse>(endpoints.admin.studentAccount(studentId));
  }, []);
}

export async function activateStudentAccount(
  studentId: number,
  payload: { email?: string; login?: string; send_invite?: boolean },
) {
  return api.post<AccountMutationResponse>(endpoints.admin.studentAccount(studentId), payload);
}

export async function activateParentAccount(
  parentId: number,
  payload: { email?: string; login?: string; send_invite?: boolean },
) {
  return api.post<AccountMutationResponse>(endpoints.admin.parentAccount(parentId), payload);
}
