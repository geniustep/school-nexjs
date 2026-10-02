export type ParentActivationExclusionReason =
  | 'no_active_relationship'
  | 'account_not_allowed'
  | 'legal_status_unknown'
  | 'not_legal_guardian'
  | 'account_blocked'
  | 'communication_not_allowed'
  | 'no_user_account'
  | 'inactive_user_account'
  | 'identity_unavailable';

export type ParentActivationSelectionSource =
  | 'automatic_default'
  | 'default_excluded_previously_contacted'
  | 'manual_include'
  | 'manual_exclude'
  | 'hard_ineligible'
  | 'legacy_existing_campaign';

export type ParentActivationMessagingState =
  | 'queued'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type ParentActivationMessagingStatusReason =
  | 'status_unavailable'
  | 'status_not_found'
  | 'contract_mismatch';

export interface ParentActivationMessagingProjection {
  state?: ParentActivationMessagingState | string;
  created_at?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  error_code?: string | null;
  status_reason?: ParentActivationMessagingStatusReason | string;
  activation?: { activated_at: string | null };
}

export interface ParentActivationCampaignRecipient {
  recipient_id: number;
  parent_id: number;
  parent_name: string;
  eligible_for_send: boolean;
  exclusion_reason: ParentActivationExclusionReason | string | null;
  has_existing_user_account: boolean;
  selected_for_send: boolean;
  selection_source: ParentActivationSelectionSource | string | null;
  contact_attempted_at_prepare: boolean;
  contact_last_dispatched_at_prepare: string | null;
  messaging?: ParentActivationMessagingProjection | null;
}

export interface ParentActivationSelectionCounts {
  selected_for_dispatch: number;
  default_selected: number;
  default_excluded_previously_contacted: number;
  manually_excluded: number;
  manually_included: number;
  hard_ineligible: number;
  legacy_existing_campaign: number;
}

export interface ParentActivationMessagingCounts {
  not_dispatched: number;
  queued: number;
  processing: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  status_unavailable: number;
  status_not_found: number;
  contract_mismatch: number;
}

export type ParentActivationCampaignArchiveStatus = 'preview' | 'saved' | 'sent';

export interface ParentActivationCampaign {
  id: number;
  name: string;
  state: 'draft' | 'prepared';
  prepared_at: string | null;
  saved_for_archive?: boolean;
  saved_at?: string | null;
  counts: { total: number; ready: number; excluded: number };
  selection_counts: ParentActivationSelectionCounts;
  messaging_status_available?: boolean;
  messaging_counts?: ParentActivationMessagingCounts;
  recipients: ParentActivationCampaignRecipient[];
}

export interface ParentActivationAudienceSummary {
  total: number;
  eligible: number;
  selected: number;
  excluded: number;
  eligible_not_selected: number;
}

export type ParentActivationHistoricalMessageStatus =
  | 'not_sent'
  | 'queued'
  | 'processing'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'unavailable';

export interface ParentActivationHistoricalMessageSummary {
  scope: 'selected_for_dispatch';
  denominator: number;
  not_sent: number;
  queued: number;
  processing: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  unavailable: number;
}

export type ParentActivationHistoricalMilestone =
  | 'dispatched'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'opened_activation_link';

export interface ParentActivationHistoricalMilestoneSummary {
  scope: 'selected_for_dispatch';
  denominator: number;
  dispatched: number;
  sent: number;
  delivered: number;
  read: number;
  opened_activation_link: number;
  status_unavailable: number;
}

export interface ParentActivationHistoricalRecipientMilestones {
  dispatched: boolean;
  sent: boolean;
  delivered: boolean;
  read: boolean;
  opened_activation_link: boolean;
}

export interface ParentActivationHistoricalRecipientMilestoneTimestamps {
  dispatched_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  opened_activation_link_at: string | null;
}

export type ParentActivationHistoricalActivationStatus =
  | 'activated_via_campaign_link'
  | 'pending_valid_link'
  | 'expired'
  | 'revoked'
  | 'not_issued'
  | 'unknown';

export interface ParentActivationHistoricalActivationSummary {
  activated_via_campaign_link: number;
  pending_valid_link: number;
  expired: number;
  revoked: number;
  not_issued: number;
  unknown: number;
}

export interface ParentActivationHistoricalMetadata {
  messaging_status_available: boolean;
  messaging_status_deferred: boolean;
  status_as_of: string | null;
  activation_as_of: string | null;
}

export interface ParentActivationHistoricalFunnel {
  semantics: string;
  audience_total: number;
  eligible: number;
  selected: number;
  dispatch_enqueued: number;
  activated_via_campaign_link: number;
  message_current_state: {
    sent: number;
    delivered: number;
    read: number;
  } | null;
  sent: number | null;
  delivered: number | null;
  read: number | null;
}

export interface ParentActivationHistoricalCampaignHeader {
  id: number;
  name: string;
  state: 'draft' | 'prepared' | string;
  create_date: string | null;
  prepared_at: string | null;
  saved_for_archive?: boolean;
  saved_at?: string | null;
}

export interface ParentActivationHistoricalCampaignListItem extends ParentActivationHistoricalCampaignHeader {
  archive_status?: ParentActivationCampaignArchiveStatus;
  audience_summary: ParentActivationAudienceSummary;
  message_summary: ParentActivationHistoricalMessageSummary | null;
  milestone_summary: ParentActivationHistoricalMilestoneSummary | null;
  activation_summary: ParentActivationHistoricalActivationSummary;
  funnel: ParentActivationHistoricalFunnel;
  metadata: ParentActivationHistoricalMetadata;
}

export interface ParentActivationHistoricalCampaignList {
  items: ParentActivationHistoricalCampaignListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ParentActivationHistoricalAnalytics {
  campaign: ParentActivationHistoricalCampaignHeader;
  audience_summary: ParentActivationAudienceSummary;
  message_summary: ParentActivationHistoricalMessageSummary;
  milestone_summary: ParentActivationHistoricalMilestoneSummary;
  activation_summary: ParentActivationHistoricalActivationSummary;
  funnel: ParentActivationHistoricalFunnel;
  metadata: ParentActivationHistoricalMetadata;
}

export interface ParentActivationHistoricalRecipient {
  recipient_id: number;
  parent_id: number;
  parent_name: string;
  eligible_for_send: boolean;
  selected_for_send: boolean;
  exclusion_reason: ParentActivationExclusionReason | string | null;
  message_status: ParentActivationHistoricalMessageStatus | null;
  activation_status: ParentActivationHistoricalActivationStatus | null;
  milestones: ParentActivationHistoricalRecipientMilestones | null;
  milestone_timestamps: ParentActivationHistoricalRecipientMilestoneTimestamps | null;
}

export interface ParentActivationHistoricalRecipientPage {
  items: ParentActivationHistoricalRecipient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  metadata: ParentActivationHistoricalMetadata;
}

export interface ParentActivationBulkSelectionRejected {
  recipient_id: number;
  reason_code: string;
}

export interface ParentActivationBulkSelectionResult {
  updated: ParentActivationCampaignRecipient[];
  rejected: ParentActivationBulkSelectionRejected[];
  counts: ParentActivationSelectionCounts;
}

export type ParentActivationDispatchStatus =
  | 'queued'
  | 'already_processed'
  | 'excluded'
  | 'not_selected'
  | 'failed';

export interface ParentActivationDispatchResultRow {
  recipient_id: number;
  parent_id: number;
  parent_name: string;
  /** Kept open for forward-compatible UI fallback instead of rendering raw values. */
  status: ParentActivationDispatchStatus | string;
  exclusion_reason: ParentActivationExclusionReason | string | null;
  error_code: string | null;
}

export interface ParentActivationCampaignDispatch {
  campaign_id: number;
  state: 'prepared' | string;
  counts: {
    total: number;
    queued: number;
    failed: number;
    excluded: number;
    already_processed: number;
    not_selected: number;
  };
  results: ParentActivationDispatchResultRow[];
}
