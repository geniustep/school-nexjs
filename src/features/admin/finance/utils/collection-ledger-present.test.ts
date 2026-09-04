import { describe, expect, it } from 'vitest';
import {
  buildCollectionLedgerQuery,
  collectionLedgerDisplayDate,
  collectionLedgerReceiptProxyUrl,
  collectionLedgerServiceSummary,
  normalizeCollectionLedgerListPayload,
  normalizeCollectionLedgerRecord,
  normalizeCollectionLedgerSummary,
} from '@/features/admin/finance/utils/collection-ledger-present';

describe('historical collection ledger presentation', () => {
  it('builds a typed historical query without inventing payment fields', () => {
    expect(
      buildCollectionLedgerQuery({
        recordType: 'historical',
        search: 'Bentager',
        academicYearId: '4',
        serviceId: '23',
        recognizedDateFrom: '2026-09-04',
        recognizedDateTo: '2026-09-04',
        page: 2,
      }),
    ).toEqual({
      page: 2,
      page_size: 50,
      record_type: 'historical',
      search: 'Bentager',
      academic_year_id: 4,
      service_id: 23,
      recognized_date_from: '2026-09-04',
      recognized_date_to: '2026-09-04',
    });
  });

  it('normalizes the Bentager historical contract truthfully', () => {
    const record = normalizeCollectionLedgerRecord({
      uid: 'historical:2:1376',
      record_type: 'historical',
      receipt_ref: 'HIST/MOASSASAALWA/2026/0002-001376',
      amount: 2500,
      status: 'applied',
      student: { id: 1376, name: 'Islam Bentager', matricule: 'X' },
      school: { id: 4, name: 'Moassasa Alwah' },
      academic_year: { id: 4, name: '2026-2027' },
      services: [
        {
          fee_type_id: 23,
          fee_type_name: 'Registration',
          historical_amount: 2500,
          settlement_ids: [209],
        },
      ],
      original_payment_date: null,
      original_payment_date_state: 'unknown',
      original_payment_method: null,
      original_payment_method_state: 'unknown',
      migration_cutoff_date: '2026-09-04',
      recognized_in_raqeem_at: '2026-09-04T20:19:41',
      printable_document_available: true,
      settlement_ids: [209],
    });

    expect(record).not.toBeNull();
    expect(record?.record_type).toBe('historical');
    expect(record?.amount).toBe(2500);
    expect(record?.payment_method).toBeNull();
    expect(record?.original_payment_method).toBeNull();
    expect(record?.original_payment_date).toBeNull();
    expect(record?.migration_cutoff_date).toBe('2026-09-04');
    expect(collectionLedgerDisplayDate(record!)).toBe('2026-09-04T20:19:41');
    expect(collectionLedgerServiceSummary(record!)).toBe('Registration');
  });

  it('keeps operational and historical records explicitly discriminated', () => {
    const payload = normalizeCollectionLedgerListPayload({
      items: [
        {
          uid: 'operational:10',
          record_type: 'operational',
          amount: 500,
          payment_date: '2026-09-04',
          payment_method: 'cash',
        },
        {
          uid: 'historical:2:1376',
          record_type: 'historical',
          amount: 2500,
          recognized_in_raqeem_at: '2026-09-04T20:19:41',
        },
      ],
      summary: {
        operational_collected: 500,
        historical_paid: 2500,
        recognized_paid: 3000,
      },
    });

    expect(payload?.items.map((row) => row.record_type)).toEqual(['operational', 'historical']);
    expect(payload?.summary?.recognized_paid).toBe(3000);
  });

  it('derives recognized total only when the backend omits it', () => {
    expect(
      normalizeCollectionLedgerSummary({
        operational_collected: 35500,
        historical_paid: 687967,
      }),
    ).toMatchObject({
      operational_collected: 35500,
      historical_paid: 687967,
      recognized_paid: 723467,
    });
  });

  it('routes historical receipt through the governed same-origin BFF', () => {
    expect(collectionLedgerReceiptProxyUrl('historical:2:1376')).toBe(
      '/api/odoo/admin/finance/collection-ledger/historical%3A2%3A1376/receipt',
    );
  });
});
