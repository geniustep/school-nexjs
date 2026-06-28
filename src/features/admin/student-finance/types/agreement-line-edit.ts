import type { AgreementLineQuantitySemantics } from '../types';

export interface AgreementLineEditPreviewSnapshot {
  line_id?: number;
  quantity?: number | null;
  periods_count?: number | null;
  unit_price?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  net_amount?: number | null;
  schedule_total?: number | null;
}

export interface NormalizedAgreementLineEditPreview {
  allowed: boolean;
  blocked: boolean;
  errorMessage: string | null;
  requiresScheduleRegeneration: boolean;
  before: AgreementLineEditPreviewSnapshot | null;
  after: AgreementLineEditPreviewSnapshot | null;
  reasonCodes: string[];
}

export interface AgreementLineEditFormInput {
  lineId: number;
  quantityValue: number;
  quantitySemantics?: AgreementLineQuantitySemantics;
  discountType: string;
  discountValue: number;
  reason?: string;
  internalNote?: string;
}
