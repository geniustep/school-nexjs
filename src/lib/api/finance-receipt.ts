'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  buildReceiptPdfFilename,
  normalizeFinanceReceipt,
  receiptAllowsAction,
} from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

export type FinanceReceiptError = 'forbidden' | 'not_found' | 'network' | 'unknown';

export interface FinanceReceiptResult {
  ok: boolean;
  error?: FinanceReceiptError;
  message?: string;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadProtectedPdf(path: string, filename: string): Promise<FinanceReceiptResult> {
  try {
    const res = await fetch(`/api/odoo${path}`, { method: 'GET', credentials: 'same-origin' });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'forbidden', message: 'errors.attachmentForbidden' };
      }
      if (res.status === 404) {
        return { ok: false, error: 'not_found', message: 'errors.attachmentNotFound' };
      }
      return { ok: false, error: 'unknown', message: 'errors.attachmentFailed' };
    }
    const blob = await res.blob();
    triggerBrowserDownload(blob, filename);
    return { ok: true };
  } catch {
    return { ok: false, error: 'network', message: 'errors.network' };
  }
}

/** Download collection receipt through BFF proxy (legacy shortcut). */
export async function downloadFinanceReceipt(
  collectionId: number,
  filename: string,
): Promise<FinanceReceiptResult> {
  return downloadProtectedPdf(endpoints.admin.financePaymentCollectionReceipt(collectionId), filename);
}

export async function downloadReceiptPdf(
  receipt: FinanceReceipt,
  lang: 'ar' | 'fr',
): Promise<FinanceReceiptResult> {
  if (!receiptAllowsAction(receipt, 'download') && !receiptAllowsAction(receipt, 'print')) {
    return { ok: false, error: 'forbidden', message: 'errors.attachmentForbidden' };
  }
  const filename = buildReceiptPdfFilename(receipt, lang);
  return downloadProtectedPdf(`${endpoints.admin.financeReceiptPdf(receipt.id)}?lang=${lang}`, filename);
}

export async function fetchCollectionReceipt(collectionId: number): Promise<FinanceReceipt | null> {
  const res = await api.get<unknown>(endpoints.admin.financePaymentCollectionReceipt(collectionId));
  if (!res.success) return null;
  return normalizeFinanceReceipt(res.data);
}

export async function issueCollectionReceipt(collectionId: number): Promise<{
  receipt: FinanceReceipt | null;
  error: FinanceReceiptResult | null;
}> {
  const res = await api.post<unknown>(endpoints.admin.financePaymentCollectionIssueReceipt(collectionId));
  if (!res.success) {
    const code = res.error?.code;
    if (code === 'forbidden') {
      return { receipt: null, error: { ok: false, error: 'forbidden', message: 'errors.attachmentForbidden' } };
    }
    if (code === 'not_found') {
      return { receipt: null, error: { ok: false, error: 'not_found', message: 'errors.attachmentNotFound' } };
    }
    return { receipt: null, error: { ok: false, error: 'unknown', message: 'errors.attachmentFailed' } };
  }
  return { receipt: normalizeFinanceReceipt(res.data), error: null };
}

export { receiptAllowsAction, buildReceiptPdfFilename };
