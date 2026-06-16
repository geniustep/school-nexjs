'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  downloadProtectedPdf,
  type FinanceReceiptResult,
} from '@/lib/api/finance-receipt';
import {
  buildCashSessionClosureFilename,
  normalizeCashSession,
  normalizeCurrentCashSession,
  parseCashSessionList,
} from '@/lib/utils/cash-session-normalize';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  AddCashMovementPayload,
  CashSession,
  CashSessionLegacyDryRun,
  CashSessionListResult,
  CloseCashSessionPayload,
  OpenCashSessionPayload,
  ReopenCashSessionPayload,
} from '@/types/finance-cash-desk';

export async function fetchCashSessions(query?: ListParams): Promise<CashSessionListResult> {
  const res = await api.get<unknown>(endpoints.admin.financeCashSessions, query);
  if (!res.success) return { items: [], pagination: null };
  return parseCashSessionList(res.data, res.meta);
}

export async function fetchCurrentCashSession(journalId: number | string): Promise<CashSession | null> {
  const res = await api.get<unknown>(endpoints.admin.financeCashSessionCurrent, {
    journal_id: journalId,
  });
  if (!res.success) return null;
  return normalizeCurrentCashSession(res.data);
}

export async function fetchCashSession(id: number | string): Promise<ApiResponse<CashSession>> {
  const res = await api.get<unknown>(endpoints.admin.financeCashSession(id));
  if (!res.success) return res as ApiResponse<CashSession>;
  const session = normalizeCashSession(res.data);
  if (!session) {
    return {
      success: false,
      error: { code: 'not_found', message: 'Cash session not found.', details: {} },
      meta: res.meta ?? {},
    };
  }
  return { success: true, data: session, meta: res.meta ?? {} };
}

export async function openCashSession(
  payload: OpenCashSessionPayload,
): Promise<ApiResponse<CashSession>> {
  const res = await api.post<unknown>(endpoints.admin.financeCashSessionOpen, payload);
  if (!res.success) return res as ApiResponse<CashSession>;
  const session = normalizeCashSession(res.data);
  if (!session) return res as ApiResponse<CashSession>;
  return { success: true, data: session, meta: res.meta ?? {} };
}

export async function startCashSessionClosing(
  id: number | string,
): Promise<ApiResponse<CashSession>> {
  const res = await api.post<unknown>(endpoints.admin.financeCashSessionStartClosing(id));
  if (!res.success) return res as ApiResponse<CashSession>;
  const session = normalizeCashSession(res.data);
  if (!session) return res as ApiResponse<CashSession>;
  return { success: true, data: session, meta: res.meta ?? {} };
}

export async function closeCashSession(
  id: number | string,
  payload: CloseCashSessionPayload,
): Promise<ApiResponse<CashSession>> {
  const res = await api.post<unknown>(endpoints.admin.financeCashSessionClose(id), payload);
  if (!res.success) return res as ApiResponse<CashSession>;
  const session = normalizeCashSession(res.data);
  if (!session) return res as ApiResponse<CashSession>;
  return { success: true, data: session, meta: res.meta ?? {} };
}

export async function reopenCashSession(
  id: number | string,
  payload: ReopenCashSessionPayload,
): Promise<ApiResponse<CashSession>> {
  const res = await api.post<unknown>(endpoints.admin.financeCashSessionReopen(id), payload);
  if (!res.success) return res as ApiResponse<CashSession>;
  const session = normalizeCashSession(res.data);
  if (!session) return res as ApiResponse<CashSession>;
  return { success: true, data: session, meta: res.meta ?? {} };
}

export async function addCashSessionMovement(
  id: number | string,
  payload: AddCashMovementPayload,
): Promise<ApiResponse<CashSession>> {
  const res = await api.post<unknown>(endpoints.admin.financeCashSessionMovements(id), payload);
  if (!res.success) return res as ApiResponse<CashSession>;
  const session = normalizeCashSession(res.data);
  if (!session) return res as ApiResponse<CashSession>;
  return { success: true, data: session, meta: res.meta ?? {} };
}

export async function fetchCashSessionLegacyDryRun(): Promise<CashSessionLegacyDryRun | null> {
  const res = await api.get<unknown>(endpoints.admin.financeCashSessionLegacyDryRun);
  if (!res.success || !res.data || typeof res.data !== 'object') return null;
  return res.data as CashSessionLegacyDryRun;
}

export async function downloadCashSessionClosurePdf(
  session: CashSession,
  lang: 'ar' | 'fr',
): Promise<FinanceReceiptResult> {
  const filename = buildCashSessionClosureFilename(session, lang);
  return downloadProtectedPdf(
    `${endpoints.admin.financeCashSessionClosurePdf(session.id)}?lang=${lang}`,
    filename,
  );
}
