import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type { ClassJournalEntryDetail, ClassJournalEntrySummary } from '@/types/teaching-delivery';
import {
  normalizeClassJournalEntries,
  normalizeClassJournalEntryDetail,
} from '../utils/normalize-teaching-delivery';

export async function fetchAdminClassJournal(
  query?: ListParams,
): Promise<ApiResponse<ClassJournalEntrySummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.classJournal, query);
  if (!res.success) return res as ApiResponse<ClassJournalEntrySummary[]>;
  return { ...res, data: normalizeClassJournalEntries(res.data) };
}

export async function fetchAdminClassJournalEntry(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ClassJournalEntryDetail>> {
  const res = await api.get<unknown>(endpoints.admin.classJournalEntry(id), query);
  if (!res.success) return res as ApiResponse<ClassJournalEntryDetail>;
  const detail = normalizeClassJournalEntryDetail(res.data);
  if (!detail) {
    return {
      success: false,
      error: { code: 'invalid_payload', message: 'Invalid class journal entry payload.', details: {} },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}
