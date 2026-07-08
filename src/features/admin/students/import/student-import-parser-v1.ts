import ExcelJS from 'exceljs';
import {
  STUDENT_IMPORT_MAX_ROWS,
  STUDENT_IMPORT_SHEET_META,
  STUDENT_IMPORT_SHEET_STUDENTS,
  STUDENT_IMPORT_TEMPLATE_VERSION,
  STUDENT_IMPORT_V1_DATA_START_ROW,
  STUDENT_IMPORT_V1_HEADER_ROW,
  STUDENT_IMPORT_V1_ID_COLUMNS,
  STUDENT_IMPORT_V1_REQUIRED_HEADERS,
  STUDENT_IMPORT_V1_USER_COLUMNS,
} from './student-import-constants';
import type { StudentImportIssue, StudentImportParseResult } from './student-import-types';

export interface StudentImportMetaV1 {
  templateVersion: number | null;
  importMode: string | null;
  schoolId: number | null;
  schoolName: string | null;
  academicYearId: number | null;
  academicYearName: string | null;
}

export interface StudentImportWorkbookRefMaps {
  academicYearsByName: Map<string, number>;
  academicYearsByCode: Map<string, number>;
  levelsByDisplayLabel: Map<string, number>;
  classesByDisplayLabel: Map<string, number>;
  guardiansByPick: Map<string, number>;
}

const V1_ALLOWED_HEADERS = new Set<string>([
  ...STUDENT_IMPORT_V1_USER_COLUMNS,
  ...STUDENT_IMPORT_V1_ID_COLUMNS,
]);

function cellHasFormula(cell: ExcelJS.Cell): boolean {
  return cell.type === ExcelJS.ValueType.Formula || cell.formula != null;
}

export function readStudentImportCellValue(cell: ExcelJS.Cell): unknown {
  if (cellHasFormula(cell)) {
    const result = cell.result;
    if (result != null && result !== '') return result;
    return null;
  }
  if (cell.type === ExcelJS.ValueType.Date) {
    return cell.value;
  }
  if (cell.type === ExcelJS.ValueType.RichText) {
    return cell.text;
  }
  return cell.value;
}

function trimString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const text = trimString(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function parseTemplateVersion(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const text = trimString(value);
  if (!text) return null;
  const match = /(\d+)/.exec(text);
  return match ? Number(match[1]) : null;
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
  return text;
}

function formatDateParts(year: number, month: number, day: number): string {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  const text = trimString(value)?.toLowerCase();
  if (!text) return null;
  if (['yes', 'true', '1', 'oui', 'نعم'].includes(text)) return true;
  if (['no', 'false', '0', 'non', 'لا'].includes(text)) return false;
  return null;
}

export function parseStudentImportMetaV1(workbook: ExcelJS.Workbook): StudentImportMetaV1 {
  const meta: StudentImportMetaV1 = {
    templateVersion: null,
    importMode: null,
    schoolId: null,
    schoolName: null,
    academicYearId: null,
    academicYearName: null,
  };

  const sheet = workbook.getWorksheet(STUDENT_IMPORT_SHEET_META);
  if (!sheet) return meta;

  const pairs = new Map<string, unknown>();
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const key = trimString(readStudentImportCellValue(row.getCell(1)));
    if (!key) continue;
    pairs.set(key, readStudentImportCellValue(row.getCell(2)));
  }

  meta.templateVersion = parseTemplateVersion(pairs.get('template_version'));
  meta.importMode = trimString(pairs.get('import_mode'));
  meta.schoolId = parseInteger(pairs.get('school_id'));
  meta.schoolName = trimString(pairs.get('school_name'));
  meta.academicYearId = parseInteger(pairs.get('academic_year_id'));
  meta.academicYearName = trimString(pairs.get('academic_year_name'));

  return meta;
}

function readRefRows(
  sheet: ExcelJS.Worksheet | undefined,
  onRow: (row: ExcelJS.Row) => void,
): void {
  if (!sheet || sheet.rowCount < 2) return;
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    onRow(sheet.getRow(rowNumber));
  }
}

export function buildStudentImportWorkbookRefMaps(workbook: ExcelJS.Workbook): StudentImportWorkbookRefMaps {
  const maps: StudentImportWorkbookRefMaps = {
    academicYearsByName: new Map(),
    academicYearsByCode: new Map(),
    levelsByDisplayLabel: new Map(),
    classesByDisplayLabel: new Map(),
    guardiansByPick: new Map(),
  };

  readRefRows(workbook.getWorksheet('Ref_AcademicYears'), (row) => {
    const id = parseInteger(readStudentImportCellValue(row.getCell(1)));
    const code = trimString(readStudentImportCellValue(row.getCell(2)));
    const name = trimString(readStudentImportCellValue(row.getCell(3)));
    if (id == null) return;
    if (name) maps.academicYearsByName.set(name, id);
    if (code) maps.academicYearsByCode.set(code, id);
  });

  readRefRows(workbook.getWorksheet('Ref_Levels'), (row) => {
    const id = parseInteger(readStudentImportCellValue(row.getCell(1)));
    const displayLabel = trimString(readStudentImportCellValue(row.getCell(4)));
    if (id != null && displayLabel) maps.levelsByDisplayLabel.set(displayLabel, id);
  });

  readRefRows(workbook.getWorksheet('Ref_Classes'), (row) => {
    const id = parseInteger(readStudentImportCellValue(row.getCell(1)));
    const displayLabel = trimString(readStudentImportCellValue(row.getCell(7)));
    if (id != null && displayLabel) maps.classesByDisplayLabel.set(displayLabel, id);
  });

  readRefRows(workbook.getWorksheet('Ref_Guardians'), (row) => {
    const id = parseInteger(readStudentImportCellValue(row.getCell(1)));
    const displayPick = trimString(readStudentImportCellValue(row.getCell(4)));
    if (id != null && displayPick) maps.guardiansByPick.set(displayPick, id);
  });

  return maps;
}

function resolveSchoolId(raw: Record<string, unknown>, meta: StudentImportMetaV1): number | null {
  const fromCell = parseInteger(raw.school_id);
  if (fromCell != null) return fromCell;
  return meta.schoolId;
}

function resolveAcademicYearId(
  raw: Record<string, unknown>,
  refs: StudentImportWorkbookRefMaps,
  meta: StudentImportMetaV1,
): number | null {
  const fromCell = parseInteger(raw.academic_year_id);
  if (fromCell != null) return fromCell;
  const label = trimString(raw.academic_year_label);
  if (label) {
    return refs.academicYearsByName.get(label) ?? refs.academicYearsByCode.get(label) ?? null;
  }
  return meta.academicYearId;
}

function resolveLevelId(raw: Record<string, unknown>, refs: StudentImportWorkbookRefMaps): number | null {
  const fromCell = parseInteger(raw.level_id);
  if (fromCell != null) return fromCell;
  const label = trimString(raw.level_label);
  return label ? refs.levelsByDisplayLabel.get(label) ?? null : null;
}

function resolveClassId(raw: Record<string, unknown>, refs: StudentImportWorkbookRefMaps): number | null {
  const fromCell = parseInteger(raw.class_id);
  if (fromCell != null) return fromCell;
  const label = trimString(raw.class_label);
  return label ? refs.classesByDisplayLabel.get(label) ?? null : null;
}

function resolveGuardianId(raw: Record<string, unknown>, refs: StudentImportWorkbookRefMaps): number | null {
  const fromCell = parseInteger(raw.guardian_id);
  if (fromCell != null) return fromCell;
  const pick = trimString(raw.guardian_pick);
  return pick ? refs.guardiansByPick.get(pick) ?? null : null;
}

export function mapV1RawRowToNormalized(
  raw: Record<string, unknown>,
  meta: StudentImportMetaV1,
  refs: StudentImportWorkbookRefMaps,
): import('./student-import-types').StudentImportNormalizedRow {
  const academicYearLabel = trimString(raw.academic_year_label);
  const levelLabel = trimString(raw.level_label);
  const classLabel = trimString(raw.class_label);

  return {
    first_name: trimString(raw.first_name),
    last_name: trimString(raw.last_name),
    massar_code: trimString(raw.massar_code),
    gender: trimString(raw.gender),
    date_of_birth: normalizeDate(raw.date_of_birth),
    school_number: trimString(raw.school_number),
    registration_type: trimString(raw.registration_type),
    previous_school: trimString(raw.previous_school),
    school_id: resolveSchoolId(raw, meta),
    academic_year_id: resolveAcademicYearId(raw, refs, meta),
    level_id: resolveLevelId(raw, refs),
    class_id: resolveClassId(raw, refs),
    academic_year_code: academicYearLabel,
    level_code: levelLabel,
    class_code: classLabel,
    guardian_id: resolveGuardianId(raw, refs),
    guardian_name: trimString(raw.guardian_name),
    guardian_mobile: trimString(raw.guardian_mobile),
    guardian_relationship_type: trimString(raw.guardian_relationship_type),
    guardian_is_primary_contact: normalizeBoolean(raw.guardian_is_primary_contact),
    guardian_is_financial_responsible: normalizeBoolean(raw.guardian_is_financial_responsible),
  };
}

function isInputRowEmpty(raw: Record<string, unknown>): boolean {
  const keys = [
    'school_number',
    'first_name',
    'last_name',
    'massar_code',
    'class_label',
    'guardian_name',
    'guardian_mobile',
  ];
  return keys.every((key) => {
    const value = raw[key];
    return value == null || trimString(value) == null;
  });
}

export function detectUnknownV1Columns(headers: string[]): string[] {
  return headers.filter((header) => !V1_ALLOWED_HEADERS.has(header));
}

export function detectMissingV1Headers(headers: string[]): string[] {
  const present = new Set(headers);
  return STUDENT_IMPORT_V1_REQUIRED_HEADERS.filter((header) => !present.has(header));
}

export function parseOdooV1StudentImportWorkbook(
  workbook: ExcelJS.Workbook,
  issueMessage: (code: string, field?: string) => string,
): StudentImportParseResult {
  const fileErrors: StudentImportIssue[] = [];
  const metaSheet = workbook.getWorksheet(STUDENT_IMPORT_SHEET_META);
  if (!metaSheet) {
    fileErrors.push({
      code: 'missing_meta_sheet',
      message: issueMessage('missing_meta_sheet'),
      severity: 'error',
    });
    return {
      templateVersion: null,
      importMode: null,
      format: 'odoo_v1',
      headers: [],
      rows: [],
      meta: null,
      fileErrors,
    };
  }

  const meta = parseStudentImportMetaV1(workbook);
  const templateVersion =
    meta.templateVersion === STUDENT_IMPORT_TEMPLATE_VERSION ? STUDENT_IMPORT_TEMPLATE_VERSION : null;

  if (templateVersion == null) {
    fileErrors.push({
      code: 'invalid_template_version',
      message: issueMessage('invalid_template_version'),
      severity: 'error',
    });
  }

  if (!meta.importMode) {
    fileErrors.push({
      code: 'missing_import_mode',
      message: issueMessage('missing_import_mode'),
      severity: 'error',
    });
  }

  const studentsSheet = workbook.getWorksheet(STUDENT_IMPORT_SHEET_STUDENTS);
  if (!studentsSheet) {
    fileErrors.push({
      code: 'missing_students_sheet',
      message: issueMessage('missing_students_sheet'),
      severity: 'error',
    });
    return {
      templateVersion,
      importMode: meta.importMode,
      format: 'odoo_v1',
      headers: [],
      rows: [],
      meta,
      fileErrors,
    };
  }

  const headerRow = studentsSheet.getRow(STUDENT_IMPORT_V1_HEADER_ROW);
  const headers: string[] = [];
  const headerIndexes = new Map<string, number>();

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = trimString(readStudentImportCellValue(cell));
    if (!key) return;
    headers.push(key);
    if (headerIndexes.has(key)) {
      fileErrors.push({
        code: 'duplicate_column',
        field: key,
        message: issueMessage('duplicate_column', key),
        severity: 'error',
      });
    } else {
      headerIndexes.set(key, colNumber);
    }
  });

  for (const column of detectMissingV1Headers(headers)) {
    fileErrors.push({
      code: 'missing_required_field',
      field: column,
      message: issueMessage('missing_required_field', column),
      severity: 'error',
    });
  }

  for (const column of detectUnknownV1Columns(headers)) {
    fileErrors.push({
      code: 'unknown_column',
      field: column,
      message: issueMessage('unknown_column', column),
      severity: 'error',
    });
  }

  const refs = buildStudentImportWorkbookRefMaps(workbook);
  const rows: Array<{ rowNumber: number; raw: Record<string, unknown> }> = [];

  for (
    let sheetRowNumber = STUDENT_IMPORT_V1_DATA_START_ROW;
    sheetRowNumber <= studentsSheet.rowCount;
    sheetRowNumber++
  ) {
    const row = studentsSheet.getRow(sheetRowNumber);
    const raw: Record<string, unknown> = {};

    for (const header of headers) {
      const col = headerIndexes.get(header);
      if (!col) continue;
      const value = readStudentImportCellValue(row.getCell(col));
      if (value == null || value === '') continue;
      raw[header] = value;
    }

    if (isInputRowEmpty(raw)) continue;

    const rowNumber = parseInteger(raw.row_number) ?? sheetRowNumber - STUDENT_IMPORT_V1_HEADER_ROW;
    rows.push({ rowNumber, raw });
  }

  if (rows.length > STUDENT_IMPORT_MAX_ROWS) {
    fileErrors.push({
      code: 'too_many_rows',
      message: issueMessage('too_many_rows'),
      severity: 'error',
    });
  }

  return {
    templateVersion,
    importMode: meta.importMode,
    format: 'odoo_v1',
    headers,
    rows,
    meta,
    fileErrors,
  };
}
