import { parseFinanceList } from '@/lib/utils/finance-normalize';

export type BillingPartnerHintKey =
  | 'studentSelf'
  | 'primaryGuardian'
  | 'financialResponsible'
  | 'singleGuardian'
  | 'specialSelected'
  | 'choosePartner'
  | 'singleOption'
  | 'serverDefault';

export interface ResolvedBillingPartner {
  id: number;
  label: string;
  type?: string;
  billing_partner_type?: string;
  payer_name?: string;
  is_default?: boolean;
  is_financial_responsible?: boolean;
  is_primary_contact?: boolean;
}

export interface BillingPartnerSelection {
  partners: ResolvedBillingPartner[];
  defaultId: number | null;
  hintKey: BillingPartnerHintKey | null;
  requiresUserChoice: boolean;
}

function partnerTypeToken(partner: ResolvedBillingPartner): string {
  return `${partner.type ?? ''} ${partner.billing_partner_type ?? ''}`.toLowerCase();
}

export function isStudentBillingPartner(partner: ResolvedBillingPartner): boolean {
  const token = partnerTypeToken(partner);
  return token.includes('student') || token.includes('تلميذ') || token.includes('élève');
}

export function isGuardianBillingPartner(partner: ResolvedBillingPartner): boolean {
  const token = partnerTypeToken(partner);
  return (
    partner.is_financial_responsible === true ||
    partner.is_primary_contact === true ||
    token.includes('guardian') ||
    token.includes('parent') ||
    token.includes('ولي') ||
    token.includes('responsable')
  );
}

export function isSpecialBillingPartner(partner: ResolvedBillingPartner): boolean {
  return !isStudentBillingPartner(partner) && !isGuardianBillingPartner(partner);
}

function normalizeBillingPartner(raw: unknown): ResolvedBillingPartner | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = Number(row.partner_id ?? row.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const label =
    (typeof row.label === 'string' && row.label.trim()) ||
    (typeof row.name === 'string' && row.name.trim()) ||
    (typeof row.payer_name === 'string' && row.payer_name.trim()) ||
    `#${id}`;

  return {
    id,
    label,
    type: typeof row.type === 'string' ? row.type : undefined,
    billing_partner_type: typeof row.billing_partner_type === 'string' ? row.billing_partner_type : undefined,
    payer_name: typeof row.payer_name === 'string' ? row.payer_name : undefined,
    is_default: row.is_default === true,
    is_financial_responsible: row.is_financial_responsible === true,
    is_primary_contact: row.is_primary_contact === true || row.is_primary === true,
  };
}

/** Parse eligible billing partners from API envelopes (`options`, list keys, or bare array). */
export function parseEligibleBillingPartners(data: unknown): ResolvedBillingPartner[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeBillingPartner).filter((row): row is ResolvedBillingPartner => row !== null);
  }
  if (typeof data !== 'object') return [];

  const envelope = data as Record<string, unknown>;
  const rows = Array.isArray(envelope.options)
    ? envelope.options
    : parseFinanceList<unknown>(data);

  return rows.map(normalizeBillingPartner).filter((row): row is ResolvedBillingPartner => row !== null);
}

export function billingPartnerDisplayLabel(partner: ResolvedBillingPartner): string {
  return partner.label.trim() || partner.payer_name?.trim() || `#${partner.id}`;
}

export function resolveBillingPartnerSelection(partners: ResolvedBillingPartner[]): BillingPartnerSelection {
  if (!partners.length) {
    return { partners, defaultId: null, hintKey: null, requiresUserChoice: false };
  }

  const serverDefaults = partners.filter((p) => p.is_default);
  if (serverDefaults.length === 1) {
    return {
      partners,
      defaultId: serverDefaults[0].id,
      hintKey: isSpecialBillingPartner(serverDefaults[0]) ? 'specialSelected' : 'serverDefault',
      requiresUserChoice: false,
    };
  }
  if (serverDefaults.length > 1) {
    return { partners, defaultId: null, hintKey: 'choosePartner', requiresUserChoice: true };
  }

  const specials = partners.filter(isSpecialBillingPartner);
  if (specials.length === 1) {
    return { partners, defaultId: specials[0].id, hintKey: 'specialSelected', requiresUserChoice: false };
  }
  if (specials.length > 1) {
    return { partners, defaultId: null, hintKey: 'choosePartner', requiresUserChoice: true };
  }

  const guardians = partners.filter(isGuardianBillingPartner);
  const financial = guardians.filter((p) => p.is_financial_responsible);
  if (financial.length === 1) {
    return {
      partners,
      defaultId: financial[0].id,
      hintKey: 'financialResponsible',
      requiresUserChoice: false,
    };
  }
  if (financial.length > 1) {
    return { partners, defaultId: null, hintKey: 'choosePartner', requiresUserChoice: true };
  }

  const primary = guardians.filter((p) => p.is_primary_contact);
  if (primary.length === 1) {
    return { partners, defaultId: primary[0].id, hintKey: 'primaryGuardian', requiresUserChoice: false };
  }

  if (guardians.length === 1) {
    return { partners, defaultId: guardians[0].id, hintKey: 'singleGuardian', requiresUserChoice: false };
  }
  if (guardians.length > 1) {
    return { partners, defaultId: null, hintKey: 'choosePartner', requiresUserChoice: true };
  }

  const students = partners.filter(isStudentBillingPartner);
  if (students.length >= 1) {
    return { partners, defaultId: students[0].id, hintKey: 'studentSelf', requiresUserChoice: false };
  }

  if (partners.length === 1) {
    return { partners, defaultId: partners[0].id, hintKey: 'singleOption', requiresUserChoice: false };
  }

  return { partners, defaultId: null, hintKey: 'choosePartner', requiresUserChoice: true };
}
