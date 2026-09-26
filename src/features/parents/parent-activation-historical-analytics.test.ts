import { describe, expect, it } from 'vitest';
import type {
  ParentActivationHistoricalCampaignListItem,
  ParentActivationHistoricalMessageSummary,
  ParentActivationHistoricalMilestoneSummary,
} from '@/types/parent-activation-campaign';
import {
  getHistoricalActivationStatusLabel,
  getHistoricalCampaignArchiveStatus,
  getHistoricalMessageStatusLabel,
  getHistoricalMilestoneLabel,
  getParentActivationHistoricalCopy,
  historicalMessageSummaryIsBalanced,
  historicalMessageSummaryTotal,
  historicalMilestoneRate,
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

const milestones = (overrides: Partial<ParentActivationHistoricalMilestoneSummary> = {}): ParentActivationHistoricalMilestoneSummary => ({
  scope: 'selected_for_dispatch',
  denominator: 100,
  dispatched: 96,
  sent: 90,
  delivered: 82,
  read: 64,
  opened_activation_link: 41,
  status_unavailable: 2,
  ...overrides,
});

const campaignItem = (
  overrides: Partial<ParentActivationHistoricalCampaignListItem> = {},
): ParentActivationHistoricalCampaignListItem => ({
  id: 1,
  name: 'Campaign',
  state: 'prepared',
  create_date: null,
  prepared_at: null,
  audience_summary: {
    total: 10,
    eligible: 8,
    selected: 7,
    excluded: 2,
    eligible_not_selected: 1,
  },
  message_summary: null,
  milestone_summary: null,
  activation_summary: {
    activated_via_campaign_link: 0,
    pending_valid_link: 0,
    expired: 0,
    revoked: 0,
    not_issued: 10,
    unknown: 0,
  },
  funnel: {
    semantics: 'test',
    audience_total: 10,
    eligible: 8,
    selected: 7,
    dispatch_enqueued: 0,
    activated_via_campaign_link: 0,
    message_current_state: null,
    sent: null,
    delivered: null,
    read: null,
  },
  metadata: {
    messaging_status_available: false,
    messaging_status_deferred: true,
    status_as_of: null,
    activation_as_of: null,
  },
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

  it('uses clear cumulative milestone labels in Arabic', () => {
    expect(getHistoricalMilestoneLabel('ar', 'sent')).toBe('أُرسلت لهم');
    expect(getHistoricalMilestoneLabel('ar', 'delivered')).toBe('تم التسليم إليهم');
    expect(getHistoricalMilestoneLabel('ar', 'read')).toBe('قرأوا الرسالة');
    expect(getHistoricalMilestoneLabel('ar', 'opened_activation_link')).toBe('فتحوا رابط التفعيل');
  });

  it('labels archived campaigns as saved or sent in Arabic', () => {
    const copy = getParentActivationHistoricalCopy('ar');
    expect(copy.savedCampaign).toBe('محفوظة');
    expect(copy.sentCampaign).toBe('تم الإرسال');
  });

  it('shows only explicit saved or sent campaign archive states', () => {
    expect(getHistoricalCampaignArchiveStatus(campaignItem({ archive_status: 'saved' }))).toBe('saved');
    expect(getHistoricalCampaignArchiveStatus(campaignItem({ archive_status: 'sent' }))).toBe('sent');
    expect(getHistoricalCampaignArchiveStatus(campaignItem({ archive_status: 'preview' }))).toBeNull();
  });

  it('keeps only proven sent campaigns visible on older runtimes', () => {
    expect(getHistoricalCampaignArchiveStatus(campaignItem())).toBeNull();
    expect(getHistoricalCampaignArchiveStatus(campaignItem({
      funnel: {
        ...campaignItem().funnel,
        dispatch_enqueued: 1,
      },
    }))).toBe('sent');
  });

  it('computes display rates only from the backend milestone denominator', () => {
    expect(historicalMilestoneRate(milestones(), 'sent')).toBe(90);
    expect(historicalMilestoneRate(milestones(), 'delivered')).toBe(82);
    expect(historicalMilestoneRate(milestones(), 'read')).toBe(64);
    expect(historicalMilestoneRate(milestones(), 'opened_activation_link')).toBe(41);
    expect(historicalMilestoneRate(milestones({ denominator: 0 }), 'read')).toBe(0);
  });
});
