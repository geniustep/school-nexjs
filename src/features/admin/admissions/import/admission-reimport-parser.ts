import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import type { AdmissionReimportRawRow } from './admission-reimport-types';

const REVIEW_ONLY_COLUMNS = new Set([
  'raw_phone',
  'quality_status',
  'review_flags',
  'source_sheet',
  'source_row',
  'target_level_label',
]);

function cellRawValue(cell: ExcelJS.Cell): unknown {
  if (cell.type === ExcelJS.ValueType.Formula) return cell.result ?? cell.formula;
  if (cell.type === ExcelJS.ValueType.Date) return cell.value;
  if (cell.type === ExcelJS.ValueType.RichText) return cell.text;
  return cell.value;
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function rowHasContent(values: Record<string, unknown>): boolean {
  return Object.entries(values).some(([key, val]) => {
    if (REVIEW_ONLY_COLUMNS.has(key)) return false;
    if (val == null || val === '') return false;
    return String(val).trim().length > 0;
  });
}

function mapRawRecord(rowNumber: number, record: Record<string, unknown>): AdmissionReimportRawRow {
  return {
    row_number: rowNumber,
    external_reference: strOrNull(record.external_reference),
    academic_year: strOrNull(record.academic_year),
    application_status: strOrNull(record.application_status),
    admission_source: strOrNull(record.admission_source),
    target_level_code: strOrNull(record.target_level_code),
    student_first_name_ar: strOrNull(record.student_first_name_ar),
    student_last_name_ar: strOrNull(record.student_last_name_ar),
    student_full_name_ar: strOrNull(record.student_full_name_ar),
    student_first_name_latin: strOrNull(record.student_first_name_latin),
    student_last_name_latin: strOrNull(record.student_last_name_latin),
    guardian_relationship: strOrNull(record.guardian_relationship),
    guardian_phone: strOrNull(record.guardian_phone),
    guardian_whatsapp: strOrNull(record.guardian_whatsapp),
    guardian_phone_secondary: strOrNull(record.guardian_phone_secondary),
    previous_school: strOrNull(record.previous_school),
    current_school: strOrNull(record.current_school),
    residence_address: strOrNull(record.residence_address),
    address: strOrNull(record.address),
    has_siblings: record.has_siblings as AdmissionReimportRawRow['has_siblings'],
    siblings_levels: strOrNull(record.siblings_levels),
    siblings_raw_text: strOrNull(record.siblings_raw_text),
    sibling_lines_json: strOrNull(record.sibling_lines_json),
    internal_notes: strOrNull(record.internal_notes),
    notes: strOrNull(record.notes),
    raw_phone: strOrNull(record.raw_phone),
    quality_status: strOrNull(record.quality_status),
    review_flags: strOrNull(record.review_flags),
    source_sheet: strOrNull(record.source_sheet),
    source_row: strOrNull(record.source_row),
    target_level_label: strOrNull(record.target_level_label),
  };
}

function strOrNull(value: unknown): string | null {
  if (value == null || value === false) return null;
  const text = String(value).trim();
  return text || null;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

export function parseAdmissionReimportCsv(text: string): AdmissionReimportRawRow[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows: AdmissionReimportRawRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const record: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      record[header] = cells[idx] ?? '';
    });
    if (!rowHasContent(record)) continue;
    rows.push(mapRawRecord(i + 1, record));
  }

  return rows;
}

async function parseWorksheet(sheet: ExcelJS.Worksheet): Promise<AdmissionReimportRawRow[]> {
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  const colKeys: string[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = normalizeHeader(cellRawValue(cell));
    headers[colNumber] = key;
    colKeys.push(key);
  });

  const rows: AdmissionReimportRawRow[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const record: Record<string, unknown> = {};
    let hasAny = false;

    for (let col = 1; col <= headers.length; col += 1) {
      const key = headers[col];
      if (!key) continue;
      const value = cellRawValue(row.getCell(col));
      if (value != null && String(value).trim()) hasAny = true;
      record[key] = value ?? '';
    }

    if (!hasAny) continue;
    if (!rowHasContent(record)) continue;
    rows.push(mapRawRecord(rowNumber, record));
  }

  return rows;
}

export async function parseAdmissionReimportFile(filePath: string): Promise<AdmissionReimportRawRow[]> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') {
    const text = fs.readFileSync(filePath, 'utf8');
    return parseAdmissionReimportCsv(text);
  }

  const buffer = fs.readFileSync(filePath);
  const workbook = new ExcelJS.Workbook();
  // exceljs typings expect Node Buffer; runtime accepts Uint8Array/ArrayBuffer.
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const sheet =
    workbook.worksheets.find((ws) => /admission|reimport|2026|2027|data|export/i.test(ws.name)) ??
    workbook.worksheets[0];
  if (!sheet) return [];
  return parseWorksheet(sheet);
}
