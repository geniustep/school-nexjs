import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatReceiptChildrenSummary,
  isFamilyReceipt,
  resolveReceiptChildrenCount,
} from '@/features/admin/finance/utils/family-receipt-present';
import {
  receiptsListHasActiveQuery,
} from '@/features/admin/finance/utils/receipts-list-present';

const t = (key: string, params?: Record<string, string | number>) => {
  if (key === 'admin.finance.receipts.childrenCountLabel') return `${params?.count} children`;
  if (key === 'admin.finance.receipts.childrenSummaryNamed') {
    return `${params?.name} + ${params?.remaining} other(s)`;
  }
  return key;
};

describe('family-receipt-present', () => {
  it('detects family receipt from flag or children_count', () => {
    expect(isFamilyReceipt({ is_multi_student: true })).toBe(true);
    expect(isFamilyReceipt({ children_count: 2 })).toBe(true);
    expect(isFamilyReceipt({ children: [{ student_id: 1 }, { student_id: 2 }] })).toBe(true);
    expect(isFamilyReceipt({ student_id: 1, student_name: 'Only' })).toBe(false);
  });

  it('prefers children_count over children length', () => {
    expect(
      resolveReceiptChildrenCount({
        children_count: 3,
        children: [{ student_id: 1 }],
      }),
    ).toBe(3);
  });

  it('formats compact named summary without listing every child', () => {
    expect(
      formatReceiptChildrenSummary(
        {
          children_count: 2,
          children: [
            { student_id: 1, student_name: 'سلمى العلوي' },
            { student_id: 2, student_name: 'أحمد' },
          ],
        },
        t,
      ),
    ).toBe('سلمى العلوي + 1 other(s)');
  });

  it('falls back to count label when names are missing', () => {
    expect(formatReceiptChildrenSummary({ children_count: 2, children: [] }, t)).toBe(
      '2 children',
    );
  });
});

describe('receipts list family filters', () => {
  it('treats involvedStudentId and billingPartnerId as active query', () => {
    expect(receiptsListHasActiveQuery({ involvedStudentId: '6858' })).toBe(true);
    expect(receiptsListHasActiveQuery({ billingPartnerId: '9046' })).toBe(true);
  });
});

describe('student receipts section query contract', () => {
  const source = readFileSync(
    resolve('src/features/admin/student-finance/components/student-receipts-section.tsx'),
    'utf8',
  );

  it('queries involved_student_id and does not use student_id for this section fetch', () => {
    expect(source).toContain('involved_student_id: studentId');
    expect(source).not.toMatch(/(?<![a-z_])student_id:\s*studentId/);
    expect(source).toContain('FamilyReceiptListMeta');
  });

  it('links view-all with involved_student_id', () => {
    expect(source).toContain('/admin/finance/receipts?involved_student_id=${studentId}');
  });
});

describe('receipts list panel family UX', () => {
  const panelSource = readFileSync(
    resolve('src/features/admin/finance/receipts-list-panel.tsx'),
    'utf8',
  );

  it('renders family meta and clears billing_partner_id on resetAll', () => {
    expect(panelSource).toContain('FamilyReceiptListMeta');
    expect(panelSource).toContain('billingPartnerId: null');
    expect(panelSource).toContain('involvedStudentId: null');
    expect(panelSource).toContain('involved_student_id:');
  });
});

describe('billing account receipts section', () => {
  const sectionSource = readFileSync(
    resolve('src/features/admin/finance/billing-account-receipts-section.tsx'),
    'utf8',
  );
  const pageSource = readFileSync(
    resolve('src/app/admin/finance/billing-accounts/[billingPartnerId]/page.tsx'),
    'utf8',
  );

  it('fetches receipts with billing_partner_id and exposes view-all link', () => {
    expect(sectionSource).toContain('billing_partner_id: billingPartnerId');
    expect(sectionSource).toContain(
      '/admin/finance/receipts?billing_partner_id=${billingPartnerId}',
    );
    expect(sectionSource).toContain('receiptsSection.empty');
    expect(sectionSource).toContain('ReceiptDetailDrawer');
    expect(sectionSource).toContain('ReceiptActionsMenu');
  });

  it('mounts section behind canViewPayments on billing account page', () => {
    expect(pageSource).toContain('BillingAccountReceiptsSection');
    expect(pageSource).toContain('canViewPayments(user)');
  });
});

describe('receipt detail family badge', () => {
  const detailSource = readFileSync(
    resolve('src/features/admin/finance/receipt-detail-view.tsx'),
    'utf8',
  );

  it('uses family receipt badge and children_count when available', () => {
    expect(detailSource).toContain('admin.finance.receipts.familyReceiptBadge');
    expect(detailSource).toContain('children_count');
  });
});
