export type BillingAuthorityPartyType = 'guardian' | 'student';

export type BillingAuthorityRef = {
  billing_party_type?: BillingAuthorityPartyType | null;
  name?: string | null;
  guardian_id?: number | null;
  billing_partner_id?: number | null;
};

export type BillingAuthorityTarget = {
  billing_party_type: BillingAuthorityPartyType;
  guardian_id?: number | null;
  billing_partner_id?: number | null;
  label: string;
  is_current?: boolean;
  is_self?: boolean;
};

export type BillingAuthorityMessage = {
  code?: string | null;
  message: string;
};

export type BillingAuthorityFinancialImpact = {
  amount_preserved_paid: number | null;
  amount_transfer_full: number | null;
  amount_split_successor: number | null;
  has_split: boolean;
};

export type NormalizedBillingAuthorityChangePreview = {
  currentAuthority: BillingAuthorityRef;
  newAuthority: BillingAuthorityRef;
  financialImpact: BillingAuthorityFinancialImpact;
  affectedAgreementsCount: number;
  warnings: BillingAuthorityMessage[];
  blockers: BillingAuthorityMessage[];
  canApply: boolean;
  previewToken: string | null;
  currency: string | null;
  eligibleTargets: BillingAuthorityTarget[];
  narrativeLines: string[];
};

export type BillingAuthorityChangePreviewRequest = {
  billing_party_type: BillingAuthorityPartyType;
  guardian_id?: number;
  billing_partner_id?: number;
};

export type BillingAuthorityChangeApplyRequest = {
  preview_token: string;
  reason: string;
  billing_party_type: BillingAuthorityPartyType;
  guardian_id?: number;
  billing_partner_id?: number;
  confirmed?: boolean;
};

export type BillingAuthorityChangeBootstrap = {
  currentAuthority: BillingAuthorityRef;
  eligibleTargets: BillingAuthorityTarget[];
};
