'use client';

import { endpoints } from '@/lib/api/endpoints';
import type { ExportFailReason } from '@/lib/utils/export-download';
import { STUDENT_IMPORT_TEMPLATE_FILENAME } from './student-import-constants';

const XLSX_ACCEPT =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, application/json, */*';

export type StudentImportTemplateDownloadResult =
  | { ok: true }
  | { ok: false; reason: ExportFailReason; message?: string };

export function buildStudentImportTemplatePath(academicYearId?: number | null): string {
  const params = new URLSearchParams();
  if (academicYearId != null) {
    params.set('academic_year_id', String(academicYearId));
  }
  const qs = params.toString();
  return qs
    ? `${endpoints.admin.studentImportTemplate}?${qs}`
    : endpoints.admin.studentImportTemplate;
}

export async function downloadStudentImportTemplate(options?: {
  academicYearId?: number | null;
}): Promise<StudentImportTemplateDownloadResult> {
  try {
    const path = buildStudentImportTemplatePath(options?.academicYearId);
    const res = await fetch(`/api/odoo${path}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: XLSX_ACCEPT },
    });

    const contentType = res.headers.get('content-type') ?? '';
    const disposition = res.headers.get('content-disposition');
    const isFile =
      res.ok &&
      (isSpreadsheetContentType(contentType) ||
        disposition?.toLowerCase().includes('attachment'));

    if (isFile) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameFromDisposition(disposition, STUDENT_IMPORT_TEMPLATE_FILENAME);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return { ok: true };
    }

    if (!res.ok) {
      return readJsonDownloadError(res);
    }

    if (contentType.includes('application/json')) {
      return readJsonDownloadError(res);
    }

    return { ok: false, reason: 'failed' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

function isSpreadsheetContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    ct.includes('spreadsheetml') ||
    ct.includes('application/vnd.ms-excel') ||
    ct.includes('application/octet-stream')
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

async function readJsonDownloadError(
  res: Response,
): Promise<{ ok: false; reason: ExportFailReason; message?: string }> {
  try {
    const json = (await res.json()) as {
      error?: { code?: string; message?: string };
    };
    if (json.error?.code === 'permission_denied' || json.error?.code === 'forbidden') {
      return { ok: false, reason: 'forbidden', message: json.error.message };
    }
    return { ok: false, reason: 'failed', message: json.error?.message };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
