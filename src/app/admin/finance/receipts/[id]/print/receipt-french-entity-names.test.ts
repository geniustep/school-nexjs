import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { FinanceReceipt } from '@/types/finance';
import {
  extractParentFrenchName,
  extractSchoolFrenchName,
  extractStudentFrenchContext,
  receiptFrenchLookupIdentity,
} from './use-receipt-french-entity-names';

const printDir = process.cwd() + '/src/app/admin/finance/receipts/[id]/print';
const pageSource = readFileSync(join(printDir, 'page.tsx'), 'utf8');

describe('French A5 receipt entity names', () => {
  it('reads the canonical French school branding field', () => {
    expect(
      extractSchoolFrenchName({ branding: { school_name_lat: 'École Les Alizés' } }),
    ).toBe('École Les Alizés');
  });

  it('reads canonical student Latin name and guardian partner identity', () => {
    expect(
      extractStudentFrenchContext({
        student: { id: 14755, name_latin: 'Yassine El Amrani' },
        guardian_relationships: [
          { guardian: { id: 29998, guardian_id: 29998, partner_id: 40123 } },
        ],
      }),
    ).toEqual({
      studentId: 14755,
      studentName: 'Yassine El Amrani',
      guardians: [{ guardianId: 29998, partnerId: 40123 }],
    });
  });

  it('reads the canonical guardian French name without translating the operational name', () => {
    expect(
      extractParentFrenchName({
        id: 29998,
        name: 'ياسين العمراني',
        name_fr: 'Yassine El Amrani',
      }),
    ).toBe('Yassine El Amrani');
  });

  it('uses receipt student IDs and billing partner ID as exact lookup keys', () => {
    const receipt = {
      id: 9001,
      student_id: 14755,
      snapshot: {
        payer: { id: 40123, billing_partner_id: 40123 },
        children: [
          { student_id: 14755, student_name: 'ياسين' },
          { student_id: 14756, student_name: 'سلمى' },
        ],
      },
    } as unknown as FinanceReceipt;

    expect(receiptFrenchLookupIdentity(receipt)).toEqual({
      studentIds: [14755, 14756],
      billingPartnerId: 40123,
    });
  });

  it('keeps the print page wired to French enrichment only as a display override', () => {
    expect(pageSource).toContain("from './use-receipt-french-entity-names'");
    expect(pageSource).toContain('useReceiptFrenchEntityNames(receipt, lang)');
    expect(pageSource).toContain("lang === 'fr' && frenchNames.schoolName");
    expect(pageSource).toContain("lang === 'fr' && frenchNames.payerName");
    expect(pageSource).toContain('frenchNames.studentNames[row.studentDisplay.id]');
  });
});
