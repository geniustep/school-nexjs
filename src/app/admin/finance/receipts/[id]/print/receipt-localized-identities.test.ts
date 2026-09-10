import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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

describe('French HTML receipt identity contract', () => {
  it('uses the canonical stored Latin school branding name and never translates a name', () => {
    expect(identitySource).toContain("'schoolNameLat'");
    expect(identitySource).toContain("'school_name_lat'");
    expect(identitySource).toContain("fetch('/api/admin/school-branding'");
    expect(identitySource).not.toContain('translate(');
  });

  it('uses the stored student French fields from an exact student read contract', () => {
    expect(identitySource).toContain("'first_name_fr'");
    expect(identitySource).toContain("'last_name_fr'");
    expect(identitySource).toContain('endpoints.admin.student(studentId)');
    expect(identitySource).toContain('collectReceiptStudentIds');
    expect(pageSource).toContain('identities.studentNames[studentId]');
  });

  it('never treats a generic parent name as a French override', () => {
    expect(identitySource).toContain('export function readParentFrenchName');
    expect(identitySource).not.toContain('normalizeParentProfile');
    expect(identitySource).not.toContain('normalizeParentProfile(data)?.name');
    expect(identitySource).toContain('generic `name` is not evidence of a stored French name');
  });

  it('keeps guardian and billing-partner id namespaces separate', () => {
    expect(identitySource).toContain('export function payerIdentityRefs');
    expect(identitySource).toContain('addPartner(receipt.billing_partner_id)');
    expect(identitySource).not.toContain('addGuardian(receipt.billing_partner_id)');
    expect(identitySource).toContain('endpoints.admin.studentGuardians(studentId)');
    expect(identitySource).toContain('fetchParentFrenchNameByGuardianId(guardianId)');
    expect(identitySource).toContain('endpoints.admin.parent(guardianId)');
  });

  it('uses only stored French aliases for a resolved payer and keeps receipt data as fallback', () => {
    expect(identitySource).toContain('readFrenchStoredName(matched)');
    expect(identitySource).toContain('readParentFrenchName(response.data)');
    expect(pageSource).toContain("(lang === 'fr' ? identities.payerName : null)");
    expect(pageSource).toContain('receipt.actual_payer_name?.trim()');
  });

  it('keeps Arabic receipt names on the existing receipt data path', () => {
    expect(pageSource).toContain("(lang === 'fr' ? identities.schoolName : null)");
    expect(pageSource).toContain("const rows = lang === 'fr'");
    expect(pageSource).toContain(': baseRows;');
  });

  it('waits for French identity hydration before automatic or manual printing', () => {
    expect(pageSource).toContain("(lang === 'fr' && !identities.ready)");
    expect(pageSource).toContain("disabled={lang === 'fr' && !identities.ready}");
    expect(pageSource).toContain('useReceiptFrenchIdentities(receipt, state.data');
  });

  it('preserves the fixed A5 double-copy and dense split contract', () => {
    expect(pageSource).toContain('data-layout="double"');
    expect(pageSource).toContain('const splitTable = rows.length > 6');
    expect(pageSource).toContain('const splitIndex = Math.ceil(rows.length / 2)');
    expect(pageSource.match(/<section className="receipt-total-card">/g)?.length).toBe(1);
  });
});
