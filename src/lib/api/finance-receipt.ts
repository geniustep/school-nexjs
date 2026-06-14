'use client';

import { endpoints } from '@/lib/api/endpoints';

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

/** Download collection receipt through BFF proxy. */
export async function downloadFinanceReceipt(
  collectionId: number,
  filename: string,
): Promise<FinanceReceiptResult> {
  try {
    const path = `/api/odoo${endpoints.admin.financePaymentCollectionReceipt(collectionId)}`;
    const res = await fetch(path, { method: 'GET', credentials: 'same-origin' });
    if (!res.ok) {
      if (res.status === 403) return { ok: false, error: 'forbidden', message: 'errors.attachmentForbidden' };
      if (res.status === 404) return { ok: false, error: 'not_found', message: 'errors.attachmentNotFound' };
      return { ok: false, error: 'unknown', message: 'errors.attachmentFailed' };
    }
    const blob = await res.blob();
    triggerBrowserDownload(blob, filename);
    return { ok: true };
  } catch {
    return { ok: false, error: 'network', message: 'errors.network' };
  }
}
