import ExcelJS from 'exceljs';
import {
  STUDENT_IMPORT_DATA_START_ROW,
  STUDENT_IMPORT_HEADER_KEY_ROW,
  STUDENT_IMPORT_HEADER_LABEL_ROW,
  STUDENT_IMPORT_MAX_ROWS,
  STUDENT_IMPORT_SHEET_EXAMPLE,
  STUDENT_IMPORT_SHEET_INSTRUCTIONS,
  STUDENT_IMPORT_SHEET_REFERENCE,
  STUDENT_IMPORT_SHEET_STUDENTS,
  STUDENT_IMPORT_TEMPLATE_VERSION,
  STUDENT_IMPORT_TEMPLATE_VERSION_CELL,
} from './student-import-constants';
import { STUDENT_IMPORT_COLUMNS } from './student-import-columns';
import { referenceListValues } from './student-import-reference';
import type {
  StudentImportReferenceData,
  StudentImportTemplateLabels,
  StudentImportValidationResult,
} from './student-import-types';

const REQUIRED_FILL = 'FFFDECEC';
const OPTIONAL_FILL = 'FFEFF6FF';
const HEADER_FONT = { bold: true, size: 11 };

type WorksheetWithValidations = ExcelJS.Worksheet & {
  dataValidations: {
    add: (
      range: string,
      rule: {
        type: string;
        allowBlank?: boolean;
        formulae: string[];
        showErrorMessage?: boolean;
      },
    ) => void;
  };
};

function colLetter(index: number): string {
  let n = index;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function protectSheet(sheet: ExcelJS.Worksheet): void {
  sheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: true,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: true,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });
}

function writeReferenceColumn(
  sheet: ExcelJS.Worksheet,
  colIndex: number,
  title: string,
  values: string[],
): string {
  sheet.getCell(1, colIndex).value = title;
  sheet.getCell(1, colIndex).font = HEADER_FONT;
  values.forEach((value, index) => {
    sheet.getCell(index + 2, colIndex).value = value;
  });
  const letter = colLetter(colIndex);
  const lastRow = Math.max(values.length + 1, 2);
  return `${STUDENT_IMPORT_SHEET_REFERENCE}!$${letter}$2:$${letter}$${lastRow}`;
}

export async function buildStudentImportTemplateWorkbook(
  reference: StudentImportReferenceData,
  labels: StudentImportTemplateLabels,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Raqeem';
  workbook.created = new Date();

  const instructions = workbook.addWorksheet(STUDENT_IMPORT_SHEET_INSTRUCTIONS);
  instructions.getCell('A1').value = labels.instructions.title;
  instructions.getCell('A1').font = { bold: true, size: 14 };
  instructions.getCell('A2').value = labels.instructions.templateVersionLabel;
  instructions.getCell(STUDENT_IMPORT_TEMPLATE_VERSION_CELL).value = STUDENT_IMPORT_TEMPLATE_VERSION;

  const lines = [
    labels.instructions.purpose,
    labels.instructions.howToFill,
    labels.instructions.requiredFields,
    labels.instructions.optionalFields,
    labels.instructions.dateFormat,
    labels.instructions.allowedValues,
    labels.instructions.doNotRenameColumns,
    labels.instructions.noFormulas,
    labels.instructions.noMergeCells,
    labels.instructions.doNotDeleteSheets,
    labels.instructions.maxRows,
    labels.instructions.excludedData,
    labels.instructions.previewNote,
    labels.instructions.classConsistency,
    labels.instructions.booleanValues,
    labels.instructions.exampleNote,
  ];

  lines.forEach((line, index) => {
    instructions.getCell(index + 4, 1).value = line;
    instructions.getCell(index + 4, 1).alignment = { wrapText: true };
  });
  instructions.getColumn(1).width = 100;
  protectSheet(instructions);

  const referenceSheet = workbook.addWorksheet(STUDENT_IMPORT_SHEET_REFERENCE);
  const refRanges: Record<string, string> = {};
  const refColumns: Array<[string, string[]]> = [
    ['gender', referenceListValues(reference, 'gender')],
    ['status', referenceListValues(reference, 'status')],
    ['registration_type', referenceListValues(reference, 'registration_type')],
    ['emergency_relationship', referenceListValues(reference, 'emergency_relationship')],
    ['nationality_code', referenceListValues(reference, 'nationality_code')],
    ['school_code', referenceListValues(reference, 'school_code')],
    ['academic_year_code', referenceListValues(reference, 'academic_year_code')],
    ['level_code', referenceListValues(reference, 'level_code')],
    ['class_code', referenceListValues(reference, 'class_code')],
    ['is_repeating', referenceListValues(reference, 'is_repeating')],
  ];

  refColumns.forEach(([key, values], index) => {
    refRanges[key] = writeReferenceColumn(referenceSheet, index + 1, key, values);
  });

  referenceSheet.state = 'veryHidden';

  const students = workbook.addWorksheet(STUDENT_IMPORT_SHEET_STUDENTS);
  STUDENT_IMPORT_COLUMNS.forEach((column, index) => {
    const col = index + 1;
    const labelCell = students.getCell(STUDENT_IMPORT_HEADER_LABEL_ROW, col);
    labelCell.value = labels.columns[column.key] ?? column.key;
    labelCell.font = HEADER_FONT;
    labelCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: column.required ? REQUIRED_FILL : OPTIONAL_FILL },
    };
    labelCell.note = labels.comments[column.key] ?? column.key;

    const keyCell = students.getCell(STUDENT_IMPORT_HEADER_KEY_ROW, col);
    keyCell.value = column.key;
    keyCell.font = { bold: true, color: { argb: 'FF666666' } };
    keyCell.protection = { locked: true };

    students.getColumn(col).width = Math.max(14, (labels.columns[column.key]?.length ?? 10) + 2);

    if (column.isDate) {
      students.getColumn(col).numFmt = 'yyyy-mm-dd';
    }

    if (column.hasDropdown && refRanges[column.key]) {
      const letter = colLetter(col);
      const range = `${letter}${STUDENT_IMPORT_DATA_START_ROW}:${letter}${STUDENT_IMPORT_DATA_START_ROW + STUDENT_IMPORT_MAX_ROWS - 1}`;
      const validationSheet = students as WorksheetWithValidations;
      validationSheet.dataValidations.add(range, {
        type: 'list',
        allowBlank: !column.required,
        formulae: [refRanges[column.key]],
        showErrorMessage: true,
      });
    }

    for (let row = STUDENT_IMPORT_DATA_START_ROW; row <= STUDENT_IMPORT_DATA_START_ROW + STUDENT_IMPORT_MAX_ROWS - 1; row++) {
      students.getCell(row, col).protection = { locked: false };
    }
  });

  students.views = [{ state: 'frozen', ySplit: STUDENT_IMPORT_HEADER_KEY_ROW, xSplit: 0, activeCell: 'A3' }];
  protectSheet(students);

  const example = workbook.addWorksheet(STUDENT_IMPORT_SHEET_EXAMPLE);
  STUDENT_IMPORT_COLUMNS.forEach((column, index) => {
    example.getCell(1, index + 1).value = column.key;
  });
  labels.exampleRows.forEach((row, rowIndex) => {
    STUDENT_IMPORT_COLUMNS.forEach((column, colIndex) => {
      const value = row[column.key as keyof typeof row];
      if (value != null) {
        example.getCell(rowIndex + 2, colIndex + 1).value = value;
      }
    });
  });
  example.state = 'hidden';

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export async function buildStudentImportErrorReportWorkbook(
  result: StudentImportValidationResult,
  headers: {
    rowNumber: string;
    field: string;
    severity: string;
    errorCode: string;
    message: string;
    originalValue: string;
    status: string;
  },
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const issuesSheet = workbook.addWorksheet('Issues');
  const issueHeaders = [
    headers.rowNumber,
    headers.field,
    headers.severity,
    headers.errorCode,
    headers.message,
    headers.originalValue,
  ];
  issuesSheet.addRow(issueHeaders);

  for (const fileError of result.fileErrors) {
    issuesSheet.addRow(['—', fileError.field ?? '—', fileError.severity, fileError.code, fileError.message, '']);
  }

  for (const row of result.rows) {
    for (const item of [...row.errors, ...row.warnings]) {
      issuesSheet.addRow([
        row.rowNumber,
        item.field ?? '—',
        item.severity,
        item.code,
        item.message,
        item.field ? String(row.raw[item.field] ?? '') : '',
      ]);
    }
  }

  const rowsSheet = workbook.addWorksheet('Rows');
  rowsSheet.addRow([
    headers.rowNumber,
    'first_name',
    'last_name',
    'school_number',
    headers.status,
  ]);
  for (const row of result.rows) {
    rowsSheet.addRow([
      row.rowNumber,
      row.normalized.first_name ?? '',
      row.normalized.last_name ?? '',
      row.normalized.school_number ?? '',
      row.status,
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export function downloadArrayBuffer(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
