import { describe, expect, it } from 'vitest';
import {
  parseEligibleBillingPartners,
  resolveBillingPartnerSelection,
} from './billing-partner-resolve';

describe('parseEligibleBillingPartners', () => {
  it('reads options envelope with partner_id', () => {
    const partners = parseEligibleBillingPartners({
      options: [{ partner_id: 10, label: 'Ahmed', type: 'student' }],
    });
    expect(partners).toEqual([
      expect.objectContaining({ id: 10, label: 'Ahmed', type: 'student' }),
    ]);
  });

  it('reads legacy id/name rows', () => {
    const partners = parseEligibleBillingPartners([{ id: 5, name: 'Fatima', billing_partner_type: 'guardian' }]);
    expect(partners[0]?.id).toBe(5);
    expect(partners[0]?.label).toBe('Fatima');
  });
});

describe('resolveBillingPartnerSelection', () => {
  it('defaults to student when no guardian exists', () => {
    const selection = resolveBillingPartnerSelection([
      { id: 1, label: 'Ali', type: 'student' },
    ]);
    expect(selection.defaultId).toBe(1);
    expect(selection.hintKey).toBe('studentSelf');
    expect(selection.requiresUserChoice).toBe(false);
  });

  it('defaults to single guardian', () => {
    const selection = resolveBillingPartnerSelection([
      { id: 2, label: 'Parent', type: 'guardian', is_primary_contact: true },
    ]);
    expect(selection.defaultId).toBe(2);
    expect(selection.requiresUserChoice).toBe(false);
  });

  it('prefers financial responsible guardian', () => {
    const selection = resolveBillingPartnerSelection([
      { id: 2, label: 'Primary', type: 'guardian', is_primary_contact: true },
      { id: 3, label: 'Finance', type: 'guardian', is_financial_responsible: true },
    ]);
    expect(selection.defaultId).toBe(3);
    expect(selection.hintKey).toBe('financialResponsible');
  });

  it('prefers primary guardian when no financial responsible', () => {
    const selection = resolveBillingPartnerSelection([
      { id: 2, label: 'Other', type: 'guardian' },
      { id: 3, label: 'Primary', type: 'guardian', is_primary_contact: true },
    ]);
    expect(selection.defaultId).toBe(3);
    expect(selection.hintKey).toBe('primaryGuardian');
  });

  it('requires user choice when multiple guardians without priority', () => {
    const selection = resolveBillingPartnerSelection([
      { id: 2, label: 'A', type: 'guardian' },
      { id: 3, label: 'B', type: 'guardian' },
    ]);
    expect(selection.defaultId).toBeNull();
    expect(selection.requiresUserChoice).toBe(true);
    expect(selection.hintKey).toBe('choosePartner');
  });

  it('selects special billing partner when present', () => {
    const selection = resolveBillingPartnerSelection([
      { id: 9, label: 'Company', type: 'company' },
      { id: 2, label: 'Parent', type: 'guardian', is_primary_contact: true },
    ]);
    expect(selection.defaultId).toBe(9);
    expect(selection.hintKey).toBe('specialSelected');
  });

  it('honors server is_default flag', () => {
    const selection = resolveBillingPartnerSelection([
      { id: 2, label: 'Parent', type: 'guardian', is_default: true },
      { id: 1, label: 'Student', type: 'student' },
    ]);
    expect(selection.defaultId).toBe(2);
    expect(selection.hintKey).toBe('serverDefault');
  });

  it('returns empty selection for no partners', () => {
    const selection = resolveBillingPartnerSelection([]);
    expect(selection.defaultId).toBeNull();
    expect(selection.partners).toEqual([]);
  });
});
