import { describe, expect, it } from 'vitest';
import {
  HISTORICAL_COLLECTION_TEMPLATE_ID,
  HISTORICAL_COLLECTION_TEMPLATE_VERSION,
  analyzeHistoricalCollectionRows,
  buildHistoricalCollectionBatchPayload,
  buildHistoricalCollectionTemplateRows,
  canConfirmHistoricalCollectionImport,
  extractHistoricalCollectionInstallmentItems,
  findMissingHistoricalCollectionHeaders,
  HISTORICAL_COLLECTION_HEADERS,
  type HistoricalCollectionParsedRow,
  type HistoricalCollectionTemplateMetadata,
} from '../historical-collection-contract';

const metadata: HistoricalCollectionTemplateMetadata = {
  templateId: HISTORICAL_COLLECTION_TEMPLATE_ID,
  templateVersion: HISTORICAL_COLLECTION_TEMPLATE_VERSION,
  schoolId: 27,
  academicYearId: 9,
  academicYearName: '2026-2027',
  importBatchRef: 'historical-collections:27:9:test',
  generatedAt: '2026-09-09T00:00:00.000Z',
};

function row(overrides: Partial<HistoricalCollectionParsedRow> = {}): HistoricalCollectionParsedRow {
  return {
    sourceRow: 2,
    studentCode: 'S-001',
    studentName: 'تلميذ تجريبي',
    schoolName: 'مدرسة',
    className: 'الأول',
    serviceName: 'التمدرس',
    outstandingAmount: 900,
    historicalAmount: 300,
    studentId: 10,
    studentFeeId: 50,
    schoolId: 27,
    academicYearId: 9,
    ...overrides,
  };
}

describe('historical collection Excel contract', () => {
  it('extracts installment rows from the Odoo list response envelope', () => {
    const items = [
      { student_id: 10, fee_id: 50, school_id: 27, academic_year_id: 9, remaining_amount: 400 },
      { student_id: 11, fee_id: 51, school_id: 27, academic_year_id: 9, remaining_amount: 500 },
    ];

    expect(extractHistoricalCollectionInstallmentItems({ items })).toEqual(items);
    expect(extractHistoricalCollectionInstallmentItems(undefined)).toEqual([]);
  });

  it('deduplicates installment rows into one student-fee template row and totals remaining amount', () => {
    const rows = buildHistoricalCollectionTemplateRows([
      { student_id: 10, fee_id: 50, school_id: 27, academic_year_id: 9, student_name: 'أحمد', remaining_amount: 400 },
      { student_id: 10, fee_id: 50, school_id: 27, academic_year_id: 9, student_name: 'أحمد', remaining_amount: 500 },
      { student_id: 11, fee_id: 51, school_id: 27, academic_year_id: 8, student_name: 'خارج السنة', remaining_amount: 100 },
    ], 9);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ studentId: 10, studentFeeId: 50, outstandingAmount: 900 });
  });

  it('validates required headers by name rather than column order', () => {
    const headers = Object.values(HISTORICAL_COLLECTION_HEADERS).reverse();
    expect(findMissingHistoricalCollectionHeaders(headers)).toEqual([]);
    expect(findMissingHistoricalCollectionHeaders(headers.filter((header) => header !== HISTORICAL_COLLECTION_HEADERS.studentFeeId))).toEqual([HISTORICAL_COLLECTION_HEADERS.studentFeeId]);
  });

  it('keeps blank amount as skipped rather than zero', () => {
    const preview = analyzeHistoricalCollectionRows(metadata, [row({ historicalAmount: '' })]);
    expect(preview.readyRows).toHaveLength(0);
    expect(preview.blankRows).toHaveLength(1);
    expect(preview.totalAmount).toBe(0);
    expect(preview.errors).toHaveLength(0);
  });

  it.each([['abc', 'invalid_amount'], [{ formula: '1+1', result: 2 }, 'invalid_amount'], [-1, 'non_positive_amount'], [0, 'non_positive_amount']])(
    'blocks invalid amount %p',
    (value, code) => {
      const preview = analyzeHistoricalCollectionRows(metadata, [row({ historicalAmount: value })]);
      expect(preview.readyRows).toHaveLength(0);
      expect(preview.errors[0]?.code).toBe(code);
      expect(canConfirmHistoricalCollectionImport(preview)).toBe(false);
    },
  );

  it('blocks scope mismatch instead of guessing identity', () => {
    const preview = analyzeHistoricalCollectionRows(metadata, [row({ schoolId: 99 })]);
    expect(preview.errors[0]?.code).toBe('scope_mismatch');
  });

  it('blocks duplicate student-fee references', () => {
    const preview = analyzeHistoricalCollectionRows(metadata, [
      row({ sourceRow: 2, historicalAmount: 100 }),
      row({ sourceRow: 3, historicalAmount: 200 }),
    ]);
    expect(preview.duplicateCount).toBe(2);
    expect(preview.readyRows).toHaveLength(0);
    expect(canConfirmHistoricalCollectionImport(preview)).toBe(false);
  });

  it('builds the authoritative Odoo batch payload only from ready rows', () => {
    const preview = analyzeHistoricalCollectionRows(metadata, [
      row({ sourceRow: 2, historicalAmount: 100 }),
      row({ sourceRow: 3, studentId: 11, studentFeeId: 51, historicalAmount: 250.5 }),
      row({ sourceRow: 4, studentId: 12, studentFeeId: 52, historicalAmount: '' }),
    ]);
    expect(canConfirmHistoricalCollectionImport(preview)).toBe(true);
    expect(preview.totalAmount).toBe(350.5);

    expect(buildHistoricalCollectionBatchPayload(preview, 'historical.xlsx')).toEqual({
      school_id: 27,
      academic_year_id: 9,
      import_batch_ref: metadata.importBatchRef,
      rows: [
        { student_id: 10, student_fee_id: 50, amount: 100, source_row: '2' },
        { student_id: 11, student_fee_id: 51, amount: 250.5, source_row: '3' },
      ],
      provenance: {
        source_name: 'Raqeem historical collections Excel',
        source_files: ['historical.xlsx'],
      },
    });
  });
});
