import { describe, expect, it } from 'vitest';
import { arrearsFollowupStatusLabel } from './arrears-followup-status-label';

const t = (key: string) => ({
  'admin.finance.arrears.statuses.needsFollowup': 'تحتاج متابعة',
  'admin.finance.arrears.statuses.paymentPromise': 'وعد أداء',
  'admin.finance.arrears.statuses.resolved': 'مغلق',
  'admin.finance.arrears.statuses.escalated': 'مصعّد',
} as Record<string, string>)[key] ?? key;

describe('arrears follow-up status label', () => {
  it('translates English needs-follow-up labels in a listed or open case', () => {
    expect(arrearsFollowupStatusLabel('open', 'Needs follow-up', t, '—')).toBe('تحتاج متابعة');
    expect(arrearsFollowupStatusLabel('needs_followup', 'Needs follow-up', t, '—')).toBe('تحتاج متابعة');
    expect(arrearsFollowupStatusLabel(null, 'needs_follow_up', t, '—')).toBe('تحتاج متابعة');
  });
  it('uses known backend status codes', () => {
    expect(arrearsFollowupStatusLabel('payment_promise', 'Payment promise', t, '—')).toBe('وعد أداء');
    expect(arrearsFollowupStatusLabel('resolved', null, t, '—')).toBe('مغلق');
    expect(arrearsFollowupStatusLabel('escalated', 'Escalated', t, '—')).toBe('مصعّد');
  });
  it('keeps unexpected values and handles no data', () => {
    expect(arrearsFollowupStatusLabel('custom', 'Manual followup', t, '—')).toBe('Manual followup');
    expect(arrearsFollowupStatusLabel(null, null, t, '—')).toBe('—');
  });
});
