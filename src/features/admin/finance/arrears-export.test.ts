import { describe, expect, it } from 'vitest';
import {
  buildArrearsExportQuery,
  buildArrearsPrintHtml,
  parseArrearsExportPayload,
} from '@/features/admin/finance/arrears-export';

const t = (key: string) => key;

describe('arrears comprehensive export', () => {
  it('builds one all-filtered request without page scope', () => {
    const query = buildArrearsExportQuery({
      search: 'Famille',
      tab: 'payment_promises',
      activeSchoolId: 7,
    });
    expect(query).toMatchObject({
      export: 1,
      active_school_id: 7,
      search: 'Famille',
      tab: 'payment_promises',
      quick: 'payment_promises',
      status: 'payment_promises',
    });
    expect(query).not.toHaveProperty('page');
    expect(query).not.toHaveProperty('page_size');
  });

  it('accepts only authoritative all-filtered payloads', () => {
    const payload = parseArrearsExportPayload({
      items: [{
        family_id: 11,
        family_name: 'Family A',
        student_count: 2,
        total_overdue: 1200.5,
        total_remaining: 2200.5,
        payment_promise_amount: 300,
      }],
      summary: {
        overdue_families_count: 1,
        total_overdue_amount: 1200.5,
        payment_promises_count: 1,
        today_followups_count: 0,
      },
      applied_filters: { tab: 'payment_promises' },
      export_meta: {
        scope: 'all_filtered',
        row_count: 1,
        max_rows: 5000,
        truncated: false,
      },
    }, 'payment_promises');

    expect(payload?.exportMeta.scope).toBe('all_filtered');
    expect(payload?.items).toHaveLength(1);
    expect(payload?.items[0]?.total_overdue).toBe(1200.5);
    expect(payload?.summary.total_overdue_amount).toBe(1200.5);
  });

  it('rejects partial/truncated export payloads', () => {
    expect(parseArrearsExportPayload({
      items: [],
      summary: {},
      export_meta: {
        scope: 'all_filtered',
        row_count: 0,
        max_rows: 5000,
        truncated: true,
      },
    }, 'all')).toBeNull();
  });

  it('builds print HTML from backend summary and exported items', () => {
    const payload = parseArrearsExportPayload({
      items: [{
        family_id: 11,
        family_name: 'Family A',
        student_count: 2,
        total_overdue: 1200.5,
        total_remaining: 2200.5,
      }],
      summary: {
        overdue_families_count: 91,
        total_overdue_amount: 9999.25,
        payment_promises_count: 5,
        today_followups_count: 3,
      },
      applied_filters: { search: 'Family' },
      export_meta: {
        scope: 'all_filtered',
        row_count: 1,
        max_rows: 5000,
        truncated: false,
      },
    }, 'all');
    expect(payload).not.toBeNull();

    const html = buildArrearsPrintHtml({
      payload: payload!,
      t,
      locale: 'en',
      dir: 'ltr',
      schoolName: 'School',
      generatedAt: new Date('2026-09-18T08:00:00Z'),
    });

    expect(html).toContain('9999.25');
    expect(html).toContain('Family A');
    expect(html).not.toContain('current page');
    expect(html).toContain('admin.finance.arrears.export.scope');
  });
});
