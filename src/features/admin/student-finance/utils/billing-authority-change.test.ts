import { describe, expect, it } from 'vitest';
import {
  buildBillingAuthorityApplyRequest,
  buildBillingAuthorityPreviewRequest,
  canSubmitBillingAuthorityApply,
  canSubmitBillingAuthorityPreview,
  canSubmitBillingAuthorityReason,
  decodeBillingAuthorityTargetKey,
  encodeBillingAuthorityTargetKey,
} from './build-billing-authority-change-payload';
import { normalizeBillingAuthorityChangePreview } from './normalize-billing-authority-change-preview';
import { canChangeBillingAuthority } from './resolve-billing-authority-change-visibility';
import type { StudentCapabilities } from '@/types/student-360';
import type { StudentFinanceCapabilities } from '@/types/student-finance';

const studentCaps = { can_manage_billing_profile: true } as StudentCapabilities;

describe('resolve billing authority change visibility', () => {
  it('1) shows change action when can_change_billing_authority is true', () => {
    const financeCaps = {
      can_change_billing_authority: true,
      can_manage_billing_profile: false,
    } as StudentFinanceCapabilities;
    expect(canChangeBillingAuthority(studentCaps, financeCaps)).toBe(true);
  });

  it('1b) falls back to can_manage_billing_profile', () => {
    const financeCaps = {
      can_change_billing_authority: false,
      can_manage_billing_profile: true,
    } as StudentFinanceCapabilities;
    expect(canChangeBillingAuthority({} as StudentCapabilities, financeCaps)).toBe(true);
  });
});

describe('billing authority preview normalization', () => {
  it('2) preview exposes current/new authority and financial impact from backend', () => {
    const preview = normalizeBillingAuthorityChangePreview({
      current_authority: { name: 'ولي الأمر أ', billing_party_type: 'guardian' },
      new_authority: { name: 'ولي الأمر ب', billing_party_type: 'guardian' },
      financial_impact: {
        amount_preserved_paid: 4200,
        amount_transfer_full: 16700,
        amount_split_successor: 2500,
      },
      affected_agreements_count: 2,
      warnings: [{ message: 'تحذير تجريبي' }],
      blockers: [],
      can_apply: true,
      preview_token: 'preview-123',
      currency: 'MAD',
    });

    expect(preview.currentAuthority.name).toBe('ولي الأمر أ');
    expect(preview.newAuthority.name).toBe('ولي الأمر ب');
    expect(preview.financialImpact.amount_preserved_paid).toBe(4200);
    expect(preview.financialImpact.amount_transfer_full).toBe(16700);
    expect(preview.financialImpact.amount_split_successor).toBe(2500);
    expect(preview.financialImpact.has_split).toBe(true);
    expect(preview.affectedAgreementsCount).toBe(2);
    expect(preview.previewToken).toBe('preview-123');
  });
});

describe('billing authority apply gating', () => {
  it('3) blockers prevent apply even with preview token', () => {
    expect(
      canSubmitBillingAuthorityApply({
        previewToken: 'token',
        reason: 'سبب',
        selection: { kind: 'guardian', guardianId: 12 },
        confirmed: false,
        canApply: false,
      }),
    ).toBe(false);
  });

  it('4) self-billing requires confirmation and reason', () => {
    expect(canSubmitBillingAuthorityReason('')).toBe(false);
    expect(
      canSubmitBillingAuthorityApply({
        previewToken: 'token',
        reason: 'التلميذ يدفع بنفسه',
        selection: { kind: 'student' },
        confirmed: false,
        canApply: true,
      }),
    ).toBe(false);
    expect(
      canSubmitBillingAuthorityApply({
        previewToken: 'token',
        reason: 'التلميذ يدفع بنفسه',
        selection: { kind: 'student' },
        confirmed: true,
        canApply: true,
      }),
    ).toBe(true);
  });

  it('5) apply payload sends preview_token and target ids', () => {
    const key = encodeBillingAuthorityTargetKey({
      kind: 'guardian',
      guardianId: 44,
      billingPartnerId: 901,
    });
    expect(decodeBillingAuthorityTargetKey(key)).toEqual({
      kind: 'guardian',
      guardianId: 44,
      billingPartnerId: 901,
    });
    expect(buildBillingAuthorityPreviewRequest(decodeBillingAuthorityTargetKey(key)!)).toEqual({
      billing_party_type: 'guardian',
      guardian_id: 44,
      billing_partner_id: 901,
    });
    expect(
      buildBillingAuthorityApplyRequest({
        previewToken: 'preview-xyz',
        reason: 'نقل الفوترة',
        selection: decodeBillingAuthorityTargetKey(key)!,
      }),
    ).toEqual({
      preview_token: 'preview-xyz',
      reason: 'نقل الفوترة',
      billing_party_type: 'guardian',
      guardian_id: 44,
      billing_partner_id: 901,
    });
    expect(canSubmitBillingAuthorityPreview(decodeBillingAuthorityTargetKey(key))).toBe(true);
  });
});
