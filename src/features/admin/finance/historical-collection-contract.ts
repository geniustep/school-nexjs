export const HISTORICAL_COLLECTION_TEMPLATE_ID = 'RAQEEM_HISTORICAL_COLLECTIONS';
export const HISTORICAL_COLLECTION_TEMPLATE_VERSION = '1';
export const HISTORICAL_COLLECTION_DATA_SHEET = 'التحصيلات';
export const HISTORICAL_COLLECTION_META_SHEET = '__raqeem_meta';
export const HISTORICAL_COLLECTION_PAGE_SIZE = 200;

export const HISTORICAL_COLLECTION_HEADERS = {
  studentCode: 'رمز التلميذ',
  studentName: 'التلميذ',
  schoolName: 'المدرسة',
  className: 'القسم',
  serviceName: 'الواجب / الخدمة',
  outstandingAmount: 'المتبقي الحالي',
  historicalAmount: 'التحصيل التاريخي',
  studentId: '__student_id',
  studentFeeId: '__student_fee_id',
  schoolId: '__school_id',
  academicYearId: '__academic_year_id',
} as const;

export const HISTORICAL_COLLECTION_REQUIRED_HEADERS = Object.values(HISTORICAL_COLLECTION_HEADERS);

export function findMissingHistoricalCollectionHeaders(headers: Iterable<string>): string[] {
  const available = new Set(headers);
  return HISTORICAL_COLLECTION_REQUIRED_HEADERS.filter((header) => !available.has(header));
}

export type HistoricalCollectionInstallmentSource = {
  id?: number;
  fee_id?: number;
  fee_name?: string;
  student_id?: number;
  student_name?: string;
  student_code?: string | null;
  school_id?: number;
  school_name?: string;
  class_name?: string;
  academic_year_id?: number;
  academic_year_name?: string;
  service_name?: string;
  service_label?: string;
  service_code?: string | null;
  remaining_amount?: number;
};

export type HistoricalCollectionTemplateRow = {
  studentCode: string;
  studentName: string;
  schoolName: string;
  className: string;
  serviceName: string;
  outstandingAmount: number;
  studentId: number;
  studentFeeId: number;
  schoolId: number;
  academicYearId: number;
};

export type HistoricalCollectionTemplateMetadata = {
  templateId: string;
  templateVersion: string;
  schoolId: number;
  academicYearId: number;
  academicYearName: string;
  importBatchRef: string;
  generatedAt: string;
};

export type HistoricalCollectionParsedRow = HistoricalCollectionTemplateRow & {
  sourceRow: number;
  historicalAmount: unknown;
};

export type HistoricalCollectionReadyRow = HistoricalCollectionTemplateRow & {
  sourceRow: number;
  historicalAmount: number;
};

export type HistoricalCollectionRowErrorCode =
  | 'invalid_identity'
  | 'scope_mismatch'
  | 'invalid_amount'
  | 'non_positive_amount'
  | 'duplicate_reference';

export type HistoricalCollectionRowError = {
  sourceRow: number;
  code: HistoricalCollectionRowErrorCode;
  message: string;
};

export type HistoricalCollectionPreview = {
  metadata: HistoricalCollectionTemplateMetadata;
  rows: HistoricalCollectionParsedRow[];
  readyRows: HistoricalCollectionReadyRow[];
  blankRows: HistoricalCollectionParsedRow[];
  errors: HistoricalCollectionRowError[];
  duplicateCount: number;
  totalAmount: number;
};

export type HistoricalCollectionBatchPayload = {
  school_id: number;
  academic_year_id: number;
  import_batch_ref: string;
  rows: Array<{
    student_id: number;
    student_fee_id: number;
    amount: number;
    source_row: string;
  }>;
  provenance: {
    source_name: string;
    source_files: string[];
  };
};

export type HistoricalCollectionBatchResult = {
  state?: string;
  run_id?: number;
  already_completed?: boolean;
  source_rows?: number;
  students?: number;
  collections_count?: number;
  allocations_count?: number;
  receipts_count?: number;
  total_amount?: number;
  service_totals?: Record<string, number>;
  import_batch_ref?: string;
  idempotency_key?: string;
  checksum?: string;
  school_id?: number;
  academic_year_id?: number;
};

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function positiveInteger(value: unknown): number | null {
  const parsed = finiteNumber(value);
  if (parsed == null || !Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function buildHistoricalCollectionTemplateRows(
  installments: HistoricalCollectionInstallmentSource[],
  academicYearId: number,
): HistoricalCollectionTemplateRow[] {
  const grouped = new Map<string, HistoricalCollectionTemplateRow>();

  for (const installment of installments) {
    const studentId = positiveInteger(installment.student_id);
    const studentFeeId = positiveInteger(installment.fee_id);
    const schoolId = positiveInteger(installment.school_id);
    const yearId = positiveInteger(installment.academic_year_id);
    if (!studentId || !studentFeeId || !schoolId || yearId !== academicYearId) continue;

    const key = `${studentId}:${studentFeeId}`;
    const remaining = Math.max(0, finiteNumber(installment.remaining_amount) ?? 0);
    const existing = grouped.get(key);
    if (existing) {
      existing.outstandingAmount = Math.round((existing.outstandingAmount + remaining) * 100) / 100;
      continue;
    }

    grouped.set(key, {
      studentCode: installment.student_code?.trim() ?? '',
      studentName: installment.student_name?.trim() || `#${studentId}`,
      schoolName: installment.school_name?.trim() ?? '',
      className: installment.class_name?.trim() ?? '',
      serviceName:
        installment.service_label?.trim() ||
        installment.service_name?.trim() ||
        installment.fee_name?.trim() ||
        installment.service_code?.trim() ||
        `#${studentFeeId}`,
      outstandingAmount: Math.round(remaining * 100) / 100,
      studentId,
      studentFeeId,
      schoolId,
      academicYearId,
    });
  }

  return [...grouped.values()].sort((a, b) =>
    a.studentName.localeCompare(b.studentName, 'ar') ||
    a.serviceName.localeCompare(b.serviceName, 'ar') ||
    a.studentFeeId - b.studentFeeId,
  );
}

export function validateTemplateScope(
  rows: HistoricalCollectionTemplateRow[],
  academicYearId: number,
): { schoolId: number; valid: boolean } {
  const schoolIds = new Set(rows.map((row) => row.schoolId));
  const years = new Set(rows.map((row) => row.academicYearId));
  const schoolId = rows[0]?.schoolId ?? 0;
  return {
    schoolId,
    valid: rows.length > 0 && schoolIds.size === 1 && years.size === 1 && years.has(academicYearId),
  };
}

export function analyzeHistoricalCollectionRows(
  metadata: HistoricalCollectionTemplateMetadata,
  rows: HistoricalCollectionParsedRow[],
): HistoricalCollectionPreview {
  const readyRows: HistoricalCollectionReadyRow[] = [];
  const blankRows: HistoricalCollectionParsedRow[] = [];
  const errors: HistoricalCollectionRowError[] = [];
  const references = new Map<string, number[]>();

  for (const row of rows) {
    const studentId = positiveInteger(row.studentId);
    const studentFeeId = positiveInteger(row.studentFeeId);
    const schoolId = positiveInteger(row.schoolId);
    const academicYearId = positiveInteger(row.academicYearId);
    const rawAmount = row.historicalAmount;
    const amountIsBlank = rawAmount == null || (typeof rawAmount === 'string' && rawAmount.trim() === '');

    if (!studentId || !studentFeeId) {
      errors.push({
        sourceRow: row.sourceRow,
        code: 'invalid_identity',
        message: 'مرجع التلميذ أو الواجب غير صالح في هذا الصف.',
      });
      continue;
    }

    if (schoolId !== metadata.schoolId || academicYearId !== metadata.academicYearId) {
      errors.push({
        sourceRow: row.sourceRow,
        code: 'scope_mismatch',
        message: 'الصف لا ينتمي إلى المدرسة أو السنة الدراسية الموجودة في القالب.',
      });
      continue;
    }

    if (amountIsBlank) {
      blankRows.push(row);
      continue;
    }

    const amount = finiteNumber(rawAmount);
    if (amount == null) {
      errors.push({
        sourceRow: row.sourceRow,
        code: 'invalid_amount',
        message: 'مبلغ التحصيل غير صالح.',
      });
      continue;
    }
    if (amount <= 0) {
      errors.push({
        sourceRow: row.sourceRow,
        code: 'non_positive_amount',
        message: 'مبلغ التحصيل يجب أن يكون أكبر من صفر.',
      });
      continue;
    }

    const reference = `${studentId}:${studentFeeId}`;
    const sourceRows = references.get(reference) ?? [];
    sourceRows.push(row.sourceRow);
    references.set(reference, sourceRows);

    readyRows.push({
      ...row,
      studentId,
      studentFeeId,
      schoolId: metadata.schoolId,
      academicYearId: metadata.academicYearId,
      historicalAmount: Math.round(amount * 100) / 100,
    });
  }

  const duplicateRows = new Set<number>();
  for (const sourceRows of references.values()) {
    if (sourceRows.length <= 1) continue;
    for (const sourceRow of sourceRows) {
      duplicateRows.add(sourceRow);
      errors.push({
        sourceRow,
        code: 'duplicate_reference',
        message: 'يوجد أكثر من صف لنفس التلميذ ونفس الواجب.',
      });
    }
  }

  const finalReadyRows = readyRows.filter((row) => !duplicateRows.has(row.sourceRow));
  const totalAmount = Math.round(finalReadyRows.reduce((sum, row) => sum + row.historicalAmount, 0) * 100) / 100;

  return {
    metadata,
    rows,
    readyRows: finalReadyRows,
    blankRows,
    errors,
    duplicateCount: duplicateRows.size,
    totalAmount,
  };
}

export function canConfirmHistoricalCollectionImport(preview: HistoricalCollectionPreview | null): boolean {
  return Boolean(preview && preview.readyRows.length > 0 && preview.errors.length === 0);
}

export function buildHistoricalCollectionBatchPayload(
  preview: HistoricalCollectionPreview,
  fileName: string,
): HistoricalCollectionBatchPayload {
  if (!canConfirmHistoricalCollectionImport(preview)) {
    throw new Error('historical_collection_preview_not_confirmable');
  }

  return {
    school_id: preview.metadata.schoolId,
    academic_year_id: preview.metadata.academicYearId,
    import_batch_ref: preview.metadata.importBatchRef,
    rows: preview.readyRows.map((row) => ({
      student_id: row.studentId,
      student_fee_id: row.studentFeeId,
      amount: row.historicalAmount,
      source_row: String(row.sourceRow),
    })),
    provenance: {
      source_name: 'Raqeem historical collections Excel',
      source_files: [fileName],
    },
  };
}
