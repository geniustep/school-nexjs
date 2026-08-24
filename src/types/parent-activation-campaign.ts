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
