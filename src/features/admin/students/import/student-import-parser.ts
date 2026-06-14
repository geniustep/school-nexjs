import ExcelJS from 'exceljs';
import {
  STUDENT_IMPORT_DATA_START_ROW,
  STUDENT_IMPORT_HEADER_KEY_ROW,
  STUDENT_IMPORT_MAX_ROWS,
  STUDENT_IMPORT_SHEET_INSTRUCTIONS,
  STUDENT_IMPORT_SHEET_STUDENTS,
  STUDENT_IMPORT_TEMPLATE_VERSION,
  STUDENT_IMPORT_TEMPLATE_VERSION_CELL,
} from './student-import-constants';
import { STUDENT_IMPORT_COLUMN_KEYS, STUDENT_IMPORT_COLUMNS } from './student-import-columns';
import type { StudentImportIssue, StudentImportParseResult } from './student-import-types';

function cellHasFormula(cell: ExcelJS.Cell): boolean {
  return cell.type === ExcelJS.ValueType.Formula || cell.formula != null;
}

function cellRawValue(cell: ExcelJS.Cell): unknown {
  if (cell.type === ExcelJS.ValueType.Formula) {
    return cell.result ?? cell.formula;
  }
  if (cell.type === ExcelJS.ValueType.Date) {
    return cell.value;
  }
  if (cell.type === ExcelJS.ValueType.RichText) {
    return cell.text;
  }
  return cell.value;
}

function parseTemplateVersion(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  const match = /(\d+)/.exec(text);
  return match ? Number(match[1]) : null;
}

export async function parseStudentImportWorkbook(
  buffer: ArrayBuffer,
  issueMessage: (code: string) => string,
): Promise<StudentImportParseResult> {
  const fileErrors: StudentImportIssue[] = [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const studentsSheet = workbook.getWorksheet(STUDENT_IMPORT_SHEET_STUDENTS);
  if (!studentsSheet) {
    fileErrors.push({
      code: 'missing_students_sheet',
      message: issueMessage('missing_students_sheet'),
      severity: 'error',
    });
    return { templateVersion: null, headers: [], rows: [], fileErrors };
  }

  const instructionsSheet = workbook.getWorksheet(STUDENT_IMPORT_SHEET_INSTRUCTIONS);
  const versionCell = instructionsSheet?.getCell(STUDENT_IMPORT_TEMPLATE_VERSION_CELL);
  const parsedVersion = parseTemplateVersion(versionCell?.value);
  const templateVersion =
    parsedVersion === STUDENT_IMPORT_TEMPLATE_VERSION ? STUDENT_IMPORT_TEMPLATE_VERSION : null;

  if (parsedVersion == null || templateVersion == null) {
    fileErrors.push({
      code: 'invalid_template_version',
      message: issueMessage('invalid_template_version'),
      severity: 'error',
    });
  }

  const keyRow = studentsSheet.getRow(STUDENT_IMPORT_HEADER_KEY_ROW);
  const headers: string[] = [];
  const headerIndexes = new Map<string, number>();

  keyRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = String(cell.value ?? '').trim();
    if (!key) return;
    headers.push(key);
    if (headerIndexes.has(key)) {
      fileErrors.push({
        code: 'duplicate_column',
        field: key,
        message: issueMessage('duplicate_column'),
        severity: 'error',
      });
    } else {
      headerIndexes.set(key, colNumber);
    }
  });

  const rows: Array<{ rowNumber: number; raw: Record<string, unknown> }> = [];

  for (let rowNumber = STUDENT_IMPORT_DATA_START_ROW; rowNumber <= studentsSheet.rowCount; rowNumber++) {
    const row = studentsSheet.getRow(rowNumber);
    const raw: Record<string, unknown> = {};
    let hasContent = false;
    let hasFormula = false;

    for (const key of STUDENT_IMPORT_COLUMN_KEYS) {
      const col = headerIndexes.get(key);
      if (!col) continue;
      const cell = row.getCell(col);
      if (cellHasFormula(cell)) {
        hasFormula = true;
        raw[key] = cell.formula;
        continue;
      }
      const value = cellRawValue(cell);
      if (value != null && value !== '') {
        hasContent = true;
        raw[key] = value;
      }
    }

    if (hasFormula) {
      fileErrors.push({
        code: 'formula_not_allowed',
        message: issueMessage('formula_not_allowed'),
        severity: 'error',
      });
    }

    if (hasContent) {
      rows.push({ rowNumber, raw });
    }
  }

  if (rows.length > STUDENT_IMPORT_MAX_ROWS) {
    fileErrors.push({
      code: 'too_many_rows',
      message: issueMessage('too_many_rows'),
      severity: 'error',
    });
  }

  return { templateVersion, headers, rows, fileErrors };
}

export function detectUnknownColumns(headers: string[]): string[] {
  const known = new Set(STUDENT_IMPORT_COLUMNS.map((c) => c.key));
  return headers.filter((h) => !known.has(h));
}

export function detectMissingRequiredColumns(headers: string[]): string[] {
  const present = new Set(headers);
  return STUDENT_IMPORT_COLUMNS.filter((c) => c.required && !present.has(c.key)).map((c) => c.key);
}
