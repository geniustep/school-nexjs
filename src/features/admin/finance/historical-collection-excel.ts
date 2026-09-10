import ExcelJS from 'exceljs';
import {
  HISTORICAL_COLLECTION_DATA_SHEET,
  HISTORICAL_COLLECTION_HEADERS,
  HISTORICAL_COLLECTION_META_SHEET,
  HISTORICAL_COLLECTION_TEMPLATE_ID,
  HISTORICAL_COLLECTION_TEMPLATE_VERSION,
  analyzeHistoricalCollectionRows,
  findMissingHistoricalCollectionHeaders,
  type HistoricalCollectionParsedRow,
  type HistoricalCollectionPreview,
  type HistoricalCollectionTemplateMetadata,
  type HistoricalCollectionTemplateRow,
} from './historical-collection-contract';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value === 'object' && 'text' in value && typeof value.text === 'string') return value.text.trim();
  if (typeof value === 'object' && 'result' in value) return cellText(value.result as ExcelJS.CellValue);
  return String(value).trim();
}


function primitiveCellText(value: ExcelJS.CellValue): string {
  return typeof value === 'number' || typeof value === 'string' ? String(value).trim() : '';
}

function metaValue(sheet: ExcelJS.Worksheet, key: string): string {
  let value = '';
  sheet.eachRow((row) => {
    if (cellText(row.getCell(1).value) === key) value = cellText(row.getCell(2).value);
  });
  return value;
}

function positiveInteger(value: string, key: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`invalid_template_metadata:${key}`);
  return parsed;
}

export function createHistoricalCollectionMetadata(input: {
  schoolId: number;
  academicYearId: number;
  academicYearName: string;
  now?: Date;
  uuid?: string;
}): HistoricalCollectionTemplateMetadata {
  const generatedAt = (input.now ?? new Date()).toISOString();
  const suffix = input.uuid ?? crypto.randomUUID();
  return {
    templateId: HISTORICAL_COLLECTION_TEMPLATE_ID,
    templateVersion: HISTORICAL_COLLECTION_TEMPLATE_VERSION,
    schoolId: input.schoolId,
    academicYearId: input.academicYearId,
    academicYearName: input.academicYearName,
    importBatchRef: `historical-collections:${input.schoolId}:${input.academicYearId}:${suffix}`,
    generatedAt,
  };
}

export async function buildHistoricalCollectionWorkbookBlob(
  rows: HistoricalCollectionTemplateRow[],
  metadata: HistoricalCollectionTemplateMetadata,
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Raqeem';
  workbook.created = new Date(metadata.generatedAt);

  const sheet = workbook.addWorksheet(HISTORICAL_COLLECTION_DATA_SHEET, {
    views: [{ state: 'frozen', ySplit: 1, rightToLeft: true }],
  });
  sheet.columns = [
    { header: HISTORICAL_COLLECTION_HEADERS.studentCode, key: 'studentCode', width: 17 },
    { header: HISTORICAL_COLLECTION_HEADERS.studentName, key: 'studentName', width: 30 },
    { header: HISTORICAL_COLLECTION_HEADERS.schoolName, key: 'schoolName', width: 24 },
    { header: HISTORICAL_COLLECTION_HEADERS.className, key: 'className', width: 20 },
    { header: HISTORICAL_COLLECTION_HEADERS.serviceName, key: 'serviceName', width: 26 },
    { header: HISTORICAL_COLLECTION_HEADERS.outstandingAmount, key: 'outstandingAmount', width: 18 },
    { header: HISTORICAL_COLLECTION_HEADERS.historicalAmount, key: 'historicalAmount', width: 20 },
    { header: HISTORICAL_COLLECTION_HEADERS.studentId, key: 'studentId', width: 14, hidden: true },
    { header: HISTORICAL_COLLECTION_HEADERS.studentFeeId, key: 'studentFeeId', width: 14, hidden: true },
    { header: HISTORICAL_COLLECTION_HEADERS.schoolId, key: 'schoolId', width: 14, hidden: true },
    { header: HISTORICAL_COLLECTION_HEADERS.academicYearId, key: 'academicYearId', width: 16, hidden: true },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.autoFilter = { from: 'A1', to: 'G1' };

  for (const row of rows) {
    const excelRow = sheet.addRow({ ...row, historicalAmount: null });
    excelRow.getCell('outstandingAmount').numFmt = '#,##0.00';
    const amountCell = excelRow.getCell('historicalAmount');
    amountCell.numFmt = '#,##0.00';
    amountCell.dataValidation = {
      type: 'decimal',
      operator: 'greaterThan',
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: 'مبلغ غير صالح',
      error: 'أدخل مبلغًا أكبر من صفر أو اترك الخانة فارغة.',
    };
  }

  const instructions = workbook.addWorksheet('تعليمات', { views: [{ rightToLeft: true }] });
  instructions.getColumn(1).width = 95;
  [
    'هذا الملف مولّد من رقيم. لا تغيّر الأعمدة التقنية المخفية ولا تنسخ صفوفًا من قالب آخر.',
    'املأ فقط عمود «التحصيل التاريخي». اترك الخانة فارغة إذا لم يوجد مبلغ تاريخي لذلك الواجب.',
    'لا يعني الاستيراد دخول مبلغ جديد إلى الخزينة الحالية؛ Odoo يطبق دلالة التحصيل التاريخي المعتمدة.',
    'بعد رفع الملف في رقيم ستظهر معاينة. لا يتم التسجيل إلا بعد الضغط صراحة على «اعتماد التحصيلات».',
  ].forEach((text) => instructions.addRow([text]));
  instructions.getColumn(1).alignment = { wrapText: true, vertical: 'top' };

  const meta = workbook.addWorksheet(HISTORICAL_COLLECTION_META_SHEET);
  meta.state = 'veryHidden';
  [
    ['template_id', metadata.templateId],
    ['template_version', metadata.templateVersion],
    ['school_id', metadata.schoolId],
    ['academic_year_id', metadata.academicYearId],
    ['academic_year_name', metadata.academicYearName],
    ['import_batch_ref', metadata.importBatchRef],
    ['generated_at', metadata.generatedAt],
  ].forEach((entry) => meta.addRow(entry));

  const raw = await workbook.xlsx.writeBuffer();
  return new Blob([raw], { type: XLSX_MIME });
}

function readMetadata(workbook: ExcelJS.Workbook): HistoricalCollectionTemplateMetadata {
  const sheet = workbook.getWorksheet(HISTORICAL_COLLECTION_META_SHEET);
  if (!sheet) throw new Error('unknown_template');

  const templateId = metaValue(sheet, 'template_id');
  const templateVersion = metaValue(sheet, 'template_version');
  if (templateId !== HISTORICAL_COLLECTION_TEMPLATE_ID) throw new Error('unknown_template');
  if (templateVersion !== HISTORICAL_COLLECTION_TEMPLATE_VERSION) throw new Error('unsupported_template_version');

  const importBatchRef = metaValue(sheet, 'import_batch_ref');
  if (!importBatchRef) throw new Error('invalid_template_metadata:import_batch_ref');

  return {
    templateId,
    templateVersion,
    schoolId: positiveInteger(metaValue(sheet, 'school_id'), 'school_id'),
    academicYearId: positiveInteger(metaValue(sheet, 'academic_year_id'), 'academic_year_id'),
    academicYearName: metaValue(sheet, 'academic_year_name'),
    importBatchRef,
    generatedAt: metaValue(sheet, 'generated_at'),
  };
}

export async function parseHistoricalCollectionWorkbook(file: File): Promise<HistoricalCollectionPreview> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('unsupported_file_type');

  const workbook = new ExcelJS.Workbook();
  const data = await file.arrayBuffer();
  await workbook.xlsx.load(data);
  const metadata = readMetadata(workbook);
  const sheet = workbook.getWorksheet(HISTORICAL_COLLECTION_DATA_SHEET);
  if (!sheet) throw new Error('missing_data_sheet');

  const headerIndex = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = cellText(cell.value);
    if (header) headerIndex.set(header, columnNumber);
  });

  const missing = findMissingHistoricalCollectionHeaders(headerIndex.keys());
  if (missing.length) throw new Error(`missing_required_columns:${missing.join('|')}`);

  const read = (row: ExcelJS.Row, header: string): ExcelJS.CellValue =>
    row.getCell(headerIndex.get(header) as number).value;
  const rows: HistoricalCollectionParsedRow[] = [];

  for (let index = 2; index <= sheet.rowCount; index += 1) {
    const row = sheet.getRow(index);
    const studentIdText = primitiveCellText(read(row, HISTORICAL_COLLECTION_HEADERS.studentId));
    const feeIdText = primitiveCellText(read(row, HISTORICAL_COLLECTION_HEADERS.studentFeeId));
    const historicalAmount = read(row, HISTORICAL_COLLECTION_HEADERS.historicalAmount);

    const entirelyEmpty = !studentIdText && !feeIdText && cellText(historicalAmount) === '';
    if (entirelyEmpty) continue;

    rows.push({
      sourceRow: index,
      studentCode: cellText(read(row, HISTORICAL_COLLECTION_HEADERS.studentCode)),
      studentName: cellText(read(row, HISTORICAL_COLLECTION_HEADERS.studentName)),
      schoolName: cellText(read(row, HISTORICAL_COLLECTION_HEADERS.schoolName)),
      className: cellText(read(row, HISTORICAL_COLLECTION_HEADERS.className)),
      serviceName: cellText(read(row, HISTORICAL_COLLECTION_HEADERS.serviceName)),
      outstandingAmount: Number(cellText(read(row, HISTORICAL_COLLECTION_HEADERS.outstandingAmount))) || 0,
      historicalAmount,
      studentId: Number(studentIdText),
      studentFeeId: Number(feeIdText),
      schoolId: Number(primitiveCellText(read(row, HISTORICAL_COLLECTION_HEADERS.schoolId))),
      academicYearId: Number(primitiveCellText(read(row, HISTORICAL_COLLECTION_HEADERS.academicYearId))),
    });
  }

  return analyzeHistoricalCollectionRows(metadata, rows);
}
