import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FinanceReceipt } from '@/types/finance';
import {
  readParentFrenchName,
  readStaffFrenchName,
  receiptIssuerUserId,
} from './receipt-localized-identities';

const printDir = join(
  process.cwd(),
  'src',
  'app',
  'admin',
  'finance',
  'receipts',
  '[id]',
  'print',
);
const pageSource = readFileSync(join(printDir, 'page.tsx'), 'utf8');
const identitySource = readFileSync(join(printDir, 'receipt-localized-identities.ts'), 'utf8');

describe('French receipt canonical name_fr contract', () => {
  it('uses school.parent.name_fr before every alternate parent display field', () => {
    expect(
      readParentFrenchName({
        name_fr: 'ahmad test',
        display_name_fr: 'DISPLAY WRONG',
        full_name: 'FULL WRONG',
        name: 'NAME WRONG',
        first_name_latin: 'LATIN',
        last_name_latin: 'WRONG',
        student: { name_fr: 'CHILD WRONG' },
      }),
    ).toBe('ahmad test');
  });

  it('finds nested parent name_fr before a root display_name_fr fallback', () => {
    expect(
      readParentFrenchName({
        display_name_fr: 'DISPLAY WRONG',
        person: { name_fr: 'abdelaziz montassir' },
      }),
    ).toBe('abdelaziz montassir');
  });

  it('uses exact parent detail before an inline relationship display fallback', () => {
    const exactDetailBlock = `const guardianId = guardianIdFromRecord(matched);\n      if (guardianId) {\n        const name = await fetchParentFrenchNameByGuardianId(guardianId);\n        if (name) return name;\n      }\n\n      const inlineName = readParentFrenchName(matched);`;
    expect(identitySource).toContain(exactDetailBlock);
  });

  it('uses res.users.name_fr before staff display/name fallbacks', () => {
    expect(
      readStaffFrenchName({
        item: {
          name_fr: 'abdelaziz montassir',
          display_name: 'DISPLAY WRONG',
          full_name: 'FULL WRONG',
          name: 'NAME WRONG',
        },
      }),
    ).toBe('abdelaziz montassir');
  });

  it('uses the issued_by object id as the staff user id and never guesses from a string name', () => {
    const withRef = {
      id: 1,
      issued_by: { id: 42, name: 'Current display' },
    } as FinanceReceipt;
    const withString = {
      id: 2,
      issued_by: 'Current display',
    } as FinanceReceipt;

    expect(receiptIssuerUserId(withRef, {})).toBe(42);
    expect(receiptIssuerUserId(withString, {})).toBeNull();
  });

  it('normalizes the official staff detail envelope before reading name_fr', () => {
    expect(identitySource).toContain(
      "import { unwrapStaffDetailResponse } from '@/features/admin/staff/utils/normalize-staff-center';",
    );
    expect(identitySource).toContain(
      'const response = await api.get<StaffDetailEnvelope | StaffMember>',
    );
    expect(identitySource).toContain('const { member } = unwrapStaffDetailResponse(response.data);');
    expect(identitySource).toContain(
      'return cleanString(member.name_fr) ?? readStaffFrenchName(member);',
    );
  });

  it('uses the French issuer only in French and preserves the existing Arabic issuer path', () => {
    expect(pageSource).toContain(
      "const issuer = (lang === 'fr' ? identities.issuerName : null) || issuedByName(receipt);",
    );
  });

  it('keeps payer billing partner namespace safety and existing logo path intact', () => {
    expect(identitySource).toContain('addPartner(receipt.billing_partner_id)');
    expect(identitySource).not.toContain('addGuardian(receipt.billing_partner_id)');
    expect(pageSource).toContain('/api/public/school-branding/logo?school_code=');
  });
});
