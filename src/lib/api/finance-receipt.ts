'use client';

import { api } from '@/lib/api/client';
import {
  isPdfArrayBuffer,
  isPdfContentType,
  PDF_MAGIC,
} from '@/lib/api/odoo-binary-response';
import { endpoints } from '@/lib/api/endpoints';
import {
  buildReceiptPdfFilename,
  normalizeFinanceReceipt,
  receiptAllowsAction,
  type ReceiptPrintLayout,
} from '@/lib/utils/normalize-finance-receipt';
import type { FinanceReceipt } from '@/types/finance';

export type ReceiptPdfLang = 'ar' | 'fr';

export type FinanceReceiptError =
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'not_pdf'
  | 'empty'
  | 'unknown';

export interface FinanceReceiptResult {
  ok: boolean;
  error?: FinanceReceiptError;
  message?: string;
}

/** Delay before revoking blob URLs so Chrome can finish loading the download. */
export const PDF_BLOB_REVOKE_DELAY_MS = 30_000;

const activePdfRequests = new Set<string>();

export function buildReceiptPdfPath(
  receiptId: number | string,
  lang: ReceiptPdfLang,
  layout: ReceiptPrintLayout,
): string {
  const params = new URLSearchParams({ lang, print_layout: layout });
  return `${endpoints.admin.financeReceiptPdf(receiptId)}?${params.toString()}`;
}

export function triggerBrowserPdfDownload(
  arrayBuffer: ArrayBuffer,
  filename: string,
  revokeDelayMs = PDF_BLOB_REVOKE_DELAY_MS,
): void {
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), revokeDelayMs);
}

export async function fetchProtectedPdfBuffer(
  path: string,
  lockKey = path,
): Promise<FinanceReceiptResult & { buffer?: ArrayBuffer }> {
  if (activePdfRequests.has(lockKey)) {
    return { ok: false, error: 'unknown', message: 'admin.finance.receipts.pdfDownloadInProgress' };
  }

  activePdfRequests.add(lockKey);
  try {
    const res = await fetch(`/api/odoo${path}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'forbidden', message: 'admin.finance.receipts.pdfDownloadFailed' };
      }
      if (res.status === 404) {
        return { ok: false, error: 'not_found', message: 'admin.finance.receipts.pdfDownloadFailed' };
      }
      return { ok: false, error: 'unknown', message: 'admin.finance.receipts.pdfDownloadFailed' };
    }

    const contentType = res.headers.get('content-type');
    if (!isPdfContentType(contentType)) {
      return { ok: false, error: 'not_pdf', message: 'admin.finance.receipts.pdfInvalidResponse' };
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return { ok: false, error: 'empty', message: 'admin.finance.receipts.pdfDownloadFailed' };
    }
    if (!isPdfArrayBuffer(arrayBuffer)) {
      return { ok: false, error: 'not_pdf', message: 'admin.finance.receipts.pdfInvalidResponse' };
    }

    return { ok: true, buffer: arrayBuffer };
  } catch {
    return { ok: false, error: 'network', message: 'admin.finance.receipts.pdfDownloadFailed' };
  } finally {
    activePdfRequests.delete(lockKey);
  }
}

export function triggerBrowserPdfPreview(
  arrayBuffer: ArrayBuffer,
  revokeDelayMs = PDF_BLOB_REVOKE_DELAY_MS,
): void {
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), revokeDelayMs);
}

export async function downloadProtectedPdf(
  path: string,
  filename: string,
): Promise<FinanceReceiptResult> {
  const lockKey = `${path}::${filename}`;
  const result = await fetchProtectedPdfBuffer(path, lockKey);
  if (!result.ok || !result.buffer) return result;
  triggerBrowserPdfDownload(result.buffer, filename);
  return { ok: true };
}

/** Download collection receipt through BFF proxy (legacy shortcut). */
export async function downloadFinanceReceipt(
  collectionId: number,
  filename: string,
): Promise<FinanceReceiptResult> {
  return downloadProtectedPdf(endpoints.admin.financePaymentCollectionReceipt(collectionId), filename);
}

function receiptPdfAccessDenied(): FinanceReceiptResult {
  return { ok: false, error: 'forbidden', message: 'errors.attachmentForbidden' };
}

export async function downloadReceiptPdf(
  receipt: FinanceReceipt,
  lang: ReceiptPdfLang,
  layout: ReceiptPrintLayout = 'a4',
): Promise<FinanceReceiptResult> {
  if (!receiptAllowsAction(receipt, 'download') && !receiptAllowsAction(receipt, 'print')) {
    return receiptPdfAccessDenied();
  }
  const path = buildReceiptPdfPath(receipt.id, lang, layout);
  const filename = buildReceiptPdfFilename(receipt, lang, layout);
  return downloadProtectedPdf(path, filename);
}

export async function previewReceiptPdf(
  receipt: FinanceReceipt,
  lang: ReceiptPdfLang,
  layout: ReceiptPrintLayout = 'a4',
): Promise<FinanceReceiptResult> {
  if (!receiptAllowsAction(receipt, 'download') && !receiptAllowsAction(receipt, 'print')) {
    return receiptPdfAccessDenied();
  }
  const path = buildReceiptPdfPath(receipt.id, lang, layout);
  const lockKey = `${path}::preview`;
  const result = await fetchProtectedPdfBuffer(path, lockKey);
  if (!result.ok || !result.buffer) return result;
  triggerBrowserPdfPreview(result.buffer);
  return { ok: true };
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

export {
  receiptAllowsAction,
  buildReceiptPdfFilename,
  PDF_MAGIC,
  isPdfArrayBuffer,
  isPdfContentType,
  type ReceiptPrintLayout,
};
