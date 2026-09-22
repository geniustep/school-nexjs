import { describe, expect, it } from 'vitest';
import type { ParentActivationCampaignRecipient } from '@/types/parent-activation-campaign';
import {
  EMPTY_PARENT_ACTIVATION_FILTERS,
  buildBulkSelectionBody,
  canDispatchSelected,
  filterParentActivationRecipients,
  getBulkSelectionRejectedLabel,
  getMessagingStatusMeta,
  recipientMessagingBucket,
} from './parent-activation-operations';

const recipient = (overrides: Partial<ParentActivationCampaignRecipient> = {}): ParentActivationCampaignRecipient => ({
  recipient_id: 1,
  parent_id: 10,
  parent_name: 'سارة بونصاح',
  eligible_for_send: true,
  exclusion_reason: null,
  has_existing_user_account: true,
  selected_for_send: true,
  selection_source: 'automatic_default',
  contact_attempted_at_prepare: false,
  contact_last_dispatched_at_prepare: null,
  messaging: null,
  ...overrides,
});

describe('parent activation operations contract', () => {
  it('searches by guardian name without mutating selection', () => {
    const rows = [recipient(), recipient({ recipient_id: 2, parent_name: 'هاجر كريش', selected_for_send: false })];
    const result = filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, query: 'سارة' });
    expect(result).toHaveLength(1);
    expect(rows[1].selected_for_send).toBe(false);
  });

  it('filters eligibility, selection and prior-contact independently', () => {
    const rows = [
      recipient(),
      recipient({ recipient_id: 2, eligible_for_send: false, selected_for_send: false, selection_source: 'hard_ineligible' }),
      recipient({ recipient_id: 3, selected_for_send: false, selection_source: 'default_excluded_previously_contacted', contact_attempted_at_prepare: true }),
    ];
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, eligibility: 'ineligible' })).toHaveLength(1);
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, selection: 'excluded' })).toHaveLength(2);
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, contact: 'contacted' })).toHaveLength(1);
  });

  it('supports first-send, contacted, failed, remediation and manual presets', () => {
    const rows = [
      recipient(),
      recipient({ recipient_id: 2, selected_for_send: false, selection_source: 'default_excluded_previously_contacted', contact_attempted_at_prepare: true }),
      recipient({ recipient_id: 3, messaging: { state: 'failed' } }),
      recipient({ recipient_id: 4, eligible_for_send: false, selected_for_send: false, selection_source: 'hard_ineligible' }),
      recipient({ recipient_id: 5, selection_source: 'manual_include' }),
      recipient({ recipient_id: 6, selected_for_send: false, selection_source: 'manual_exclude' }),
    ];
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, preset: 'first_send_ready' }).map((row) => row.recipient_id)).toEqual([1, 3, 5]);
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, preset: 'contacted_not_activated' }).map((row) => row.recipient_id)).toEqual([2]);
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, preset: 'failed' }).map((row) => row.recipient_id)).toEqual([3]);
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, preset: 'needs_remediation' }).map((row) => row.recipient_id)).toEqual([4]);
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, preset: 'manually_included' }).map((row) => row.recipient_id)).toEqual([5]);
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, preset: 'manually_excluded' }).map((row) => row.recipient_id)).toEqual([6]);
  });

  it('keeps read distinct from delivered and maps Arabic read copy correctly', () => {
    const row = recipient({ messaging: { state: 'read', read_at: '2026-09-22T06:00:00', delivered_at: null } });
    expect(recipientMessagingBucket(row)).toBe('read');
    expect(recipientMessagingBucket(recipient(), false)).toBe('status_unavailable');
    expect(getMessagingStatusMeta('ar', row).label).toBe('تمت القراءة');
    expect(getMessagingStatusMeta('ar', recipient({ messaging: { state: 'sent' } })).label).not.toBe('تم التسليم');
  });

  it('builds bounded deterministic bulk selection bodies from marked ids', () => {
    expect(buildBulkSelectionBody([1, 1, 2, -5], true)).toEqual({ include_recipient_ids: [1, 2], exclude_recipient_ids: [] });
    expect(buildBulkSelectionBody([3, 3], false)).toEqual({ include_recipient_ids: [], exclude_recipient_ids: [3] });
  });

  it('does not use stale read/failed states for presets when messaging service is unavailable', () => {
    const rows = [recipient({ messaging: { state: 'read' } }), recipient({ recipient_id: 2, messaging: { state: 'failed' } })];
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, preset: 'read_not_activated' }, false)).toHaveLength(0);
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, preset: 'failed' }, false)).toHaveLength(0);
  });

  it('filters by selection source explicitly', () => {
    const rows = [recipient(), recipient({ recipient_id: 2, selected_for_send: false, selection_source: 'manual_exclude' })];
    expect(filterParentActivationRecipients(rows, { ...EMPTY_PARENT_ACTIVATION_FILTERS, selectionSource: 'manual_exclude' }).map((row) => row.recipient_id)).toEqual([2]);
  });

  it('maps rejected bulk-selection reasons to safe user copy', () => {
    expect(getBulkSelectionRejectedLabel('ar', 'recipient_not_eligible_for_selection')).toContain('لم يعودوا مؤهلين');
    expect(getBulkSelectionRejectedLabel('ar', 'future_private_code')).not.toContain('future_private_code');
  });

  it('disables dispatch at zero selected, while preparing, or while dispatching', () => {
    expect(canDispatchSelected(0, false, false)).toBe(false);
    expect(canDispatchSelected(3, true, false)).toBe(false);
    expect(canDispatchSelected(3, false, true)).toBe(false);
    expect(canDispatchSelected(3, false, false)).toBe(true);
  });

});
