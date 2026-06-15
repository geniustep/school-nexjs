import { describe, expect, it } from 'vitest';
import type { TranslateFn } from '@/features/i18n/locale-context';
import { formatFinancePlural } from '@/features/admin/finance/finance-hub-plural';

const AR_MESSAGES: Record<string, string> = {
  'admin.finance.hub.plural.rejectedCheque.zero': '',
  'admin.finance.hub.plural.rejectedCheque.one': 'شيك واحد مرفوض',
  'admin.finance.hub.plural.rejectedCheque.two': 'شيكان مرفوضان',
  'admin.finance.hub.plural.rejectedCheque.few': '{count} شيكات مرفوضة',
  'admin.finance.hub.plural.rejectedCheque.many': '{count} شيكًا مرفوضًا',
  'admin.finance.hub.plural.overdueInstallment.few': '{count} أقساط متأخرة',
  'admin.finance.hub.plural.draftCollection.two': 'تحصيلان غير مكتملين',
};

const t: TranslateFn = (key, params) => {
  let text = AR_MESSAGES[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
};

describe('formatFinancePlural (Arabic)', () => {
  it('uses natural forms for 0, 1, 2, 3, and 11', () => {
    expect(formatFinancePlural(t, 'ar', 'rejectedCheque', 0)).toBe('');
    expect(formatFinancePlural(t, 'ar', 'rejectedCheque', 1)).toBe('شيك واحد مرفوض');
    expect(formatFinancePlural(t, 'ar', 'rejectedCheque', 2)).toBe('شيكان مرفوضان');
    expect(formatFinancePlural(t, 'ar', 'rejectedCheque', 3)).toBe('3 شيكات مرفوضة');
    expect(formatFinancePlural(t, 'ar', 'rejectedCheque', 11)).toBe('11 شيكًا مرفوضًا');
  });

  it('avoids slash-style technical phrasing for installments', () => {
    expect(formatFinancePlural(t, 'ar', 'overdueInstallment', 5)).toBe('5 أقساط متأخرة');
    expect(formatFinancePlural(t, 'ar', 'draftCollection', 2)).toBe('تحصيلان غير مكتملين');
  });
});
