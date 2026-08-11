'use client';

// Official server-side export via BFF (CSV from GET …/export endpoints).

import type { ListParams } from '@/types/api';

const PROXY_BASE = '/api/odoo';

function isFileContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    ct.includes('text/csv') ||
    ct.includes('application/csv') ||
    ct.includes('application/octet-stream') ||
    ct.includes('spreadsheetml') ||
    ct.includes('application/vnd.ms-excel')
  );
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return star[1];
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain?.[1] ?? fallback;
}

export function buildOfficialExportUrl(path: string, query?: ListParams): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const question = clean.indexOf('?');
  const pathname = question >= 0 ? clean.slice(0, question) : clean;
  const params = new URLSearchParams(question >= 0 ? clean.slice(question + 1) : '');

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value == null || value === '') continue;
    params.set(key, String(value));
  }

  const qs = params.toString();
  return `${PROXY_BASE}${pathname}${qs ? `?${qs}` : ''}`;
}

export type ExportFailReason = 'forbidden' | 'failed' | 'network';

async function readJsonError(res: Response): Promise<{ reason: ExportFailReason; message?: string }> {
  try {
    const json = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    if (json.error?.code === 'permission_denied' || json.error?.code === 'forbidden') {
      return { reason: 'forbidden', message: json.error.message };
    }
    return { reason: 'failed', message: json.error?.message };
  } catch {
    return { reason: 'failed' };
  }
}

export async function downloadOfficialExport(
  path: string,
  filename: string,
  query?: ListParams,
): Promise<{ ok: true } | { ok: false; reason: ExportFailReason; message?: string }> {
  try {
    const res = await fetch(buildOfficialExportUrl(path, query), {
      method: 'GET',
      headers: { Accept: 'text/csv, application/octet-stream, application/json, */*' },
    });

    const contentType = res.headers.get('content-type') ?? '';
    const disposition = res.headers.get('content-disposition');
    const isFile =
      res.ok &&
      (isFileContentType(contentType) || disposition?.toLowerCase().includes('attachment'));

    if (isFile) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameFromDisposition(disposition, filename);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { ok: true };
    }

    if (!res.ok) {
      const err = await readJsonError(res);
      return { ok: false, ...err };
    }

    if (contentType.includes('application/json')) {
      const err = await readJsonError(res);
      return { ok: false, ...err };
    }

    return { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Client-side CSV export for currently displayed rows only. */
export function downloadClientCsv(
  rows: Record<string, string | number | null | undefined>[],
  filename: string,
): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(String(row[h] ?? ''))).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
