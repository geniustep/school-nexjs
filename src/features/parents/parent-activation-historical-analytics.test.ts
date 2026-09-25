import { describe, expect, it } from 'vitest';
import type { ParentActivationHistoricalMessageSummary } from '@/types/parent-activation-campaign';
import {
  getHistoricalActivationStatusLabel,
  getHistoricalMessageStatusLabel,
  historicalMessageSummaryIsBalanced,
  historicalMessageSummaryTotal,
} from './parent-activation-historical-analytics';

const summary = (overrides: Partial<ParentActivationHistoricalMessageSummary> = {}): ParentActivationHistoricalMessageSummary => ({
  scope: 'selected_for_dispatch',
  denominator: 8,
  not_sent: 1,
  queued: 1,
  processing: 1,
  sent: 1,
  delivered: 1,
  read: 1,
  failed: 1,
  unavailable: 1,
  ...overrides,
});

describe('parent activation historical analytics presentation', () => {
  it('keeps the exclusive latest-state summary balanced against its backend denominator', () => {
    expect(historicalMessageSummaryTotal(summary())).toBe(8);
    expect(historicalMessageSummaryIsBalanced(summary())).toBe(true);
    expect(historicalMessageSummaryIsBalanced(summary({ denominator: 9 }))).toBe(false);
  });

  it('keeps not-sent distinct from unavailable in Arabic copy', () => {
    expect(getHistoricalMessageStatusLabel('ar', 'not_sent')).toBe('لم يُرسل بعد');
    expect(getHistoricalMessageStatusLabel('ar', 'unavailable')).toBe('حالة الرسالة غير متاحة');
  });

  it('uses campaign-link attribution wording instead of generic activation wording', () => {
    expect(getHistoricalActivationStatusLabel('ar', 'activated_via_campaign_link')).toBe('استُخدم رابط الحملة');
    expect(getHistoricalActivationStatusLabel('fr', 'pending_valid_link')).toBe('Lien valide non utilisé');
  });
});
