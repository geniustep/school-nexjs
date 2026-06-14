import ExcelJS from 'exceljs';
import type { StudentImportExecutionState } from './student-import-server-types';

export async function buildStudentImportResultReportWorkbook(
  execution: StudentImportExecutionState,
  headers: {
    filename: string;
    school: string;
    date: string;
    state: string;
    totalRows: string;
    createdRows: string;
    failedRows: string;
    skippedRows: string;
    rowNumber: string;
    studentName: string;
    schoolNumber: string;
    massarCode: string;
    status: string;
    studentId: string;
    enrollmentId: string;
    errorCodes: string;
    errorMessages: string;
    warningCodes: string;
    warningMessages: string;
  },
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.addRow([headers.filename, execution.sourceFilename ?? '']);
  summarySheet.addRow([headers.date, new Date().toISOString()]);
  summarySheet.addRow([headers.state, execution.state]);
  summarySheet.addRow([headers.totalRows, execution.summary.total_rows]);
  summarySheet.addRow([headers.createdRows, execution.summary.created_rows ?? 0]);
  summarySheet.addRow([headers.failedRows, execution.summary.failed_rows ?? 0]);
  summarySheet.addRow([headers.skippedRows, execution.summary.skipped_rows ?? 0]);

  const resultsSheet = workbook.addWorksheet('Results');
  resultsSheet.addRow([
    headers.rowNumber,
    headers.studentName,
    headers.schoolNumber,
    headers.massarCode,
    headers.status,
    headers.studentId,
    headers.enrollmentId,
    headers.errorCodes,
    headers.errorMessages,
    headers.warningCodes,
    headers.warningMessages,
  ]);

  for (const row of execution.rows) {
    resultsSheet.addRow([
      row.row_number,
      row.display_name ?? '',
      row.school_number ?? '',
      row.massar_code ?? '',
      row.status,
      row.student_id ?? '',
      row.enrollment_id ?? '',
      row.errors.map((e) => e.code).join('; '),
      row.errors.map((e) => e.message).join('; '),
      row.warnings.map((w) => w.code).join('; '),
      row.warnings.map((w) => w.message).join('; '),
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
