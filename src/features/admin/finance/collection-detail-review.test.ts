import { describe, expect, it } from 'vitest';
import {
  buildCollectionDetailTitle,
  buildCollectionStatusBannerKey,
  getCollectionCommercialReference,
  getCollectionStudentLabel,
  getCollectionUnallocatedAmount,
  resolveCollectionReviewActions,
} from './collection-detail-review';
import { formatAllocationRowDetails } from './collection-normalize';
import type { PaymentCollection } from '@/types/finance';

const t = (key: string, vars?: Record<string, string | number>) => {
  const map: Record<string, string> = {
    'admin.finance.states.draft': 'مسودة',
    'admin.finance.methodCheque': 'شيك',
    'admin.finance.collections.detail.titlePattern': '{status} تحصيل بـ{method}',
    'admin.finance.collections.detail.subtitleWithStudent': '{student} · {amount}',
    'admin.finance.collections.detail.subtitleNoStudent': 'تحصيل بـ{method} · {amount}',
    'admin.finance.collections.detail.allocationSettlement': 'حالة التسوية',
    'academic.status': 'الحالة',
    'admin.finance.unavailable': 'غير متاح',
    'admin.finance.collections.detail.confirmDisabled.permission': 'no permission',
    'admin.finance.collections.detail.confirmDisabled.notAllowed': 'not allowed',
    'admin.finance.collections.detail.cancelDisabled.notAllowed': 'cancel not allowed',
  };
  let value = map[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }
  return value;
};

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

  it('builds human page title without MAD prefix in Arabic subtitle', () => {
    const title = buildCollectionDetailTitle(draftChequeCollection, t, 'ar');
    expect(title.primary).toContain('مسودة');
    expect(title.primary).toContain('شيك');
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

  it('uses allowed_actions for confirm and hides cancel when absent', () => {
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

describe('confirmed collection review', () => {
  const confirmed = {
    id: 1482,
    student_name: 'عبد العزيز حميد',
    state: 'confirmed',
    payment_method: 'cheque',
    cheque: { id: 399, state: 'received', cheque_number: '123456' },
    receipt_number: 'REC/RAQEEM/2026/000007',
    receipt_id: 507,
    allowed_actions: ['cancel', 'receipt', 'print', 'download', 'view_cheque'],
  } as PaymentCollection;

  it('uses cheque pending banner for confirmed cheque not cleared', () => {
    expect(buildCollectionStatusBannerKey(confirmed)).toBe(
      'admin.finance.collections.detail.statusBanner.confirmedChequePending',
    );
  });
});
