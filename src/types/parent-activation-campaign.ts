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

export interface ParentActivationCampaignRecipient {
  recipient_id?: number;
  parent_id: number;
  parent_name: string;
  eligible_for_send: boolean;
  exclusion_reason: ParentActivationExclusionReason | null;
  has_existing_user_account: boolean;
}

export interface ParentActivationCampaign {
  id: number;
  name: string;
  state: 'draft' | 'prepared';
  prepared_at: string | null;
  counts: { total: number; ready: number; excluded: number };
  recipients: ParentActivationCampaignRecipient[];
}

export type ParentActivationDispatchStatus =
  | 'queued'
  | 'already_processed'
  | 'excluded'
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
  };
  results: ParentActivationDispatchResultRow[];
}
