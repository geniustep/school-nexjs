import { describe, expect, it } from 'vitest';
import {
  buildChequeReviewDisplay,
  buildCollectionDetailTitle,
  buildCollectionStatusBannerKey,
  buildCollectionTimeline,
  getChequeBankDisplayName,
  getCollectionCommercialReference,
  getCollectionStudentLabel,
  getCollectionUnallocatedAmount,
  resolveCollectionReviewActions,
  resolvePartiesDisplay,
} from './collection-detail-review';
import { formatAllocationRowDetails } from './collection-normalize';
import type { PaymentCollection } from '@/types/finance';

const t = (key: string, vars?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'admin.finance.states.draft': 'مسودة',
    'admin.finance.methodCheque': 'شيك',
    'admin.finance.collections.detail.titleDraftCheque': 'مسودة تحصيل بالشيك',
    'admin.finance.collections.detail.titleConfirmedCheque': 'تحصيل مؤكد بالشيك',
    'admin.finance.collections.detail.subtitleWithStudent': '{student} · {amount}',
    'admin.finance.collections.detail.subtitleNoStudent': 'تحصيل بـ{method} · {amount}',
    'admin.finance.collections.detail.allocationSettlement': 'حالة التسوية',
    'admin.finance.collections.detail.billingPartyAndPayer': 'الجهة المفوترة والدافع',
    'admin.finance.collections.detail.notStored': 'غير محفوظ',
    'admin.finance.collections.detail.chequeSettlement.pending': 'قيد التحصيل',
    'admin.finance.collections.detail.chequeNotPostdatedBadge': 'غير مؤجل',
    'admin.finance.collections.detail.chequePostdatedBadge': 'شيك مؤجل',
    'admin.finance.cheques.chequeNumber': 'رقم الشيك',
    'admin.finance.cheques.bankName': 'البنك',
    'admin.finance.cheques.holderName': 'صاحب الشيك',
    'admin.finance.cheques.dueDate': 'تاريخ الاستحقاق',
    'admin.finance.collections.detail.chequeWrittenDate': 'تاريخ الشيك',
    'academic.status': 'الحالة',
    'admin.finance.unavailable': 'غير متاح',
    'admin.finance.collections.detail.confirmDisabled.permission': 'no permission',
    'admin.finance.collections.detail.confirmDisabled.notAllowed': 'not allowed',
    'admin.finance.collections.detail.cancelDisabled.notAllowed': 'cancel not allowed',
    'admin.finance.collections.detail.timeline.draftCreated': 'أُنشئت المسودة',
    'admin.finance.collections.detail.timeline.confirmed': 'أُكد التحصيل',
    'admin.finance.collections.detail.timeline.receiptIssued': 'صدر الإيصال',
    'admin.finance.collections.detail.timeline.chequePending': 'الشيك قيد التحصيل',
  };
  let value = map[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
};

const formatDate = (value: string | null | undefined) => (value ? `DATE:${value}` : '');

const draftChequeCollection = {
  id: 1459,
  student_id: 854,
  student_name: 'عبد العزيز حميد',
  payer_name: 'ولي أمر عبد العزيز حميد',
  billing_partner_name: 'ولي أمر عبد العزيز حميد',
  amount: 4500,
  allocated_amount: 4500,
  unallocated_amount: 0,
  state: 'draft',
  payment_method: 'cheque',
  currency: 'MAD',
  allowed_actions: ['confirm', 'update'],
  allocations: [
    {
      id: 1586,
      installment_id: 3634,
      amount: 2500,
      display_label: 'التسجيل',
      settlement_state: 'pending',
      state: 'draft',
    },
    {
      id: 1587,
      installment_id: 3635,
      amount: 2000,
      display_label: 'التمدرس — يونيو 2026',
      settlement_state: 'pending',
      state: 'draft',
    },
  ],
} as PaymentCollection;

const confirmedChequeCollection = {
  id: 1482,
  student_name: 'عبد العزيز حميد',
  student_code: 'A12455689',
  payer_name: 'ولي أمر عبد العزيز حميد',
  billing_partner_name: 'ولي أمر عبد العزيز حميد',
  billing_party_type: 'guardian',
  reference: '123456',
  amount: 4500,
  allocated_amount: 4500,
  unallocated_amount: 0,
  state: 'confirmed',
  payment_method: 'cheque',
  receipt_number: 'REC/RAQEEM/2026/000007',
  receipt_id: 517,
  cheque: {
    id: 399,
    cheque_number: '123456',
    bank_name: 'التج',
    holder_name: 'زكر',
    due_date: '2026-06-17',
    received_date: '2026-06-17',
    state: 'received',
    settlement_status: 'pending',
  },
  allowed_actions: {
    view_receipt: true,
    download_receipt: true,
    print_receipt: true,
    view_cheque: true,
    cancel: true,
    open_student_finance: true,
  },
  status_history: [
    { event: 'created', occurred_at: '2026-06-17 18:20:23' },
    { event: 'confirmed', occurred_at: '2026-06-17 18:21:00' },
    { event: 'receipt_issued', occurred_at: '2026-06-17 18:21:05' },
    { event: 'cheque_pending', occurred_at: '2026-06-17 18:21:05' },
  ],
} as PaymentCollection;

describe('collection detail review', () => {
  it('shows student_name from API instead of unavailable', () => {
    expect(getCollectionStudentLabel(draftChequeCollection, 'غير متاح')).toBe('عبد العزيز حميد');
    expect(getCollectionStudentLabel(draftChequeCollection, 'غير متاح')).not.toBe('غير متاح');
  });

  it('uses display_label for allocation titles and avoids technical IDs', () => {
    const row = draftChequeCollection.allocations![0];
    const details = formatAllocationRowDetails(row, t, 'ar');
    expect(details.title).toBe('التسجيل');
    expect(details.title).not.toContain('#3634');
    expect(details.internalId).toBe('3634');
  });

  it('builds natural draft cheque title', () => {
    const title = buildCollectionDetailTitle(draftChequeCollection, t, 'ar');
    expect(title.primary).toBe('مسودة تحصيل بالشيك');
    expect(title.secondary).toContain('عبد العزيز حميد');
    expect(title.secondary).toContain('4 500,00 د.م.');
    expect(title.secondary).not.toContain('MAD');
  });

  it('reads allocated and unallocated amounts from API', () => {
    expect(getCollectionUnallocatedAmount(draftChequeCollection)).toBe(0);
  });

  it('separates commercial reference from internal id', () => {
    expect(getCollectionCommercialReference(draftChequeCollection)).toBeNull();
    expect(getCollectionCommercialReference({ ...draftChequeCollection, reference: 'COLL-1' })).toBe(
      'COLL-1',
    );
  });

  it('uses allowed_actions array for confirm and hides cancel when absent', () => {
    const actions = resolveCollectionReviewActions(draftChequeCollection, {
      canCollect: true,
      canCancel: true,
      t,
    });
    expect(actions.canConfirm).toBe(true);
    expect(actions.canCancel).toBe(false);
    expect(actions.cancelDisabledReason).toBe('admin.finance.collections.detail.cancelDisabled.notAllowed');
  });

  it('shows draft status banner key', () => {
    expect(buildCollectionStatusBannerKey(draftChequeCollection)).toBe(
      'admin.finance.collections.detail.statusBanner.draft',
    );
  });

  it('formats second allocation with readable label', () => {
    const details = formatAllocationRowDetails(draftChequeCollection.allocations![1], t, 'ar');
    expect(details.title).toBe('التمدرس — يونيو 2026');
  });
});

describe('confirmed cheque collection polish', () => {
  it('uses natural confirmed cheque title', () => {
    const title = buildCollectionDetailTitle(confirmedChequeCollection, t, 'ar');
    expect(title.primary).toBe('تحصيل مؤكد بالشيك');
    expect(title.primary).not.toContain('مؤكد تحصيل');
    expect(title.secondary).toContain('عبد العزيز حميد');
    expect(title.chequeBadgeKey).toBe('admin.finance.collections.detail.chequePendingBadge');
  });

  it('merges payer and billing party when names match', () => {
    const parties = resolvePartiesDisplay(confirmedChequeCollection);
    expect(parties.showPayer).toBe(false);
    expect(parties.showBilling).toBe(true);
    expect(parties.billingLabelKey).toBe('admin.finance.collections.detail.billingPartyAndPayer');
  });

  it('keeps payer and billing separate when names differ', () => {
    const parties = resolvePartiesDisplay({
      ...confirmedChequeCollection,
      payer_name: 'زكرياء',
      billing_partner_name: 'ولي أمر عبد العزيز حميد',
    });
    expect(parties.showPayer).toBe(true);
    expect(parties.showBilling).toBe(true);
    expect(parties.billingLabelKey).toBe('admin.finance.billingPartner');
  });

  it('shows bank name as returned by API without mapping', () => {
    expect(getChequeBankDisplayName(confirmedChequeCollection.cheque!)).toBe('التج');
  });

  it('renders cheque review fields with translated labels', () => {
    const display = buildChequeReviewDisplay(confirmedChequeCollection.cheque, formatDate, t);
    expect(display).not.toBeNull();
    expect(display!.fields.find((f) => f.key === 'number')?.label).toBe('رقم الشيك');
    expect(display!.fields.find((f) => f.key === 'number')?.value).toBe('123456');
    expect(display!.fields.find((f) => f.key === 'bank')?.value).toBe('التج');
    expect(display!.settlementLabelKey).toBe(
      'admin.finance.collections.detail.chequeSettlement.pending',
    );
    expect(display!.postdatedBadgeKey).toBe(
      'admin.finance.collections.detail.chequeNotPostdatedBadge',
    );
    expect(t(display!.settlementLabelKey!)).toBe('قيد التحصيل');
  });

  it('marks postdated cheque when due date is after cheque date', () => {
    const display = buildChequeReviewDisplay(
      {
        ...confirmedChequeCollection.cheque!,
        received_date: '2026-06-01',
        due_date: '2026-06-17',
      },
      formatDate,
      t,
    );
    expect(display!.postdatedBadgeKey).toBe(
      'admin.finance.collections.detail.chequePostdatedBadge',
    );
  });

  it('uses cheque pending banner for confirmed cheque not cleared', () => {
    expect(buildCollectionStatusBannerKey(confirmedChequeCollection)).toBe(
      'admin.finance.collections.detail.statusBanner.confirmedChequePending',
    );
  });

  it('reads allowed_actions map for receipt and cheque actions', () => {
    const actions = resolveCollectionReviewActions(confirmedChequeCollection, {
      canCollect: true,
      canCancel: true,
      t,
    });
    expect(actions.canViewReceipt).toBe(true);
    expect(actions.canDownloadReceipt).toBe(true);
    expect(actions.canViewCheque).toBe(true);
    expect(actions.canOpenStudentFinance).toBe(true);
    expect(actions.canCancel).toBe(true);
    expect(actions.canConfirm).toBe(false);
  });

  it('builds timeline from official status_history', () => {
    const timeline = buildCollectionTimeline(confirmedChequeCollection);
    expect(timeline).toHaveLength(4);
    expect(timeline.map((e) => e.labelKey)).toContain(
      'admin.finance.collections.detail.timeline.chequePending',
    );
    expect(timeline.every((e) => t(e.labelKey) === e.labelKey)).toBe(false);
  });

  it('does not expose raw translation keys in cheque labels', () => {
    const display = buildChequeReviewDisplay(confirmedChequeCollection.cheque, formatDate, t);
    for (const field of display!.fields) {
      expect(field.label).not.toMatch(/^admin\.finance\./);
    }
  });
});
