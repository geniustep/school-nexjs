import {
  STUDENT_IMPORT_BOOLEAN_NO_VALUES,
  STUDENT_IMPORT_BOOLEAN_YES_VALUES,
} from './student-import-constants';
import { STUDENT_IMPORT_COLUMN_KEYS } from './student-import-columns';
import type { StudentImportNormalizedRow, StudentImportRow } from './student-import-types';

function assignRowField(
  row: StudentImportNormalizedRow,
  key: keyof StudentImportRow,
  value: string | null,
): void {
  (row as StudentImportRow)[key] = value;
}

function trimString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  const text = trimString(value);
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const slash = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (slash) {
    const [, d, m, y] = slash;
    return formatDateParts(Number(y), Number(m), Number(d));
  }
  const iso = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/.exec(text);
  if (iso) {
    const [, y, m, d] = iso;
    return formatDateParts(Number(y), Number(m), Number(d));
  }
  return text;
}

function formatDateParts(year: number, month: number, day: number): string {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function normalizeBoolean(value: unknown): boolean | null {
  const text = trimString(value)?.toLowerCase();
  if (!text) return null;
  if (STUDENT_IMPORT_BOOLEAN_YES_VALUES.has(text)) return true;
  if (STUDENT_IMPORT_BOOLEAN_NO_VALUES.has(text)) return false;
  return null;
}

export function normalizeStudentImportRow(raw: Record<string, unknown>): StudentImportNormalizedRow {
  const normalized: StudentImportNormalizedRow = {};

  for (const key of STUDENT_IMPORT_COLUMN_KEYS) {
    const value = raw[key];
    if (key === 'is_repeating') {
      normalized.is_repeating = normalizeBoolean(value);
      continue;
    }
    if (
      key === 'date_of_birth' ||
      key === 'admission_date' ||
      key === 'actual_join_date'
    ) {
      assignRowField(normalized, key, normalizeDate(value));
      continue;
    }
    assignRowField(normalized, key as keyof StudentImportRow, trimString(value));
  }

  return normalized;
}

export function isStudentImportRowEmpty(row: StudentImportNormalizedRow): boolean {
  return STUDENT_IMPORT_COLUMN_KEYS.every((key) => {
    const value = row[key as keyof StudentImportNormalizedRow];
    return value == null || value === '';
  });
}

export function rowFingerprint(row: StudentImportNormalizedRow): string {
  return STUDENT_IMPORT_COLUMN_KEYS.map((key) => {
    const value = row[key as keyof StudentImportNormalizedRow];
    return `${key}=${value ?? ''}`;
  }).join('|');
}
