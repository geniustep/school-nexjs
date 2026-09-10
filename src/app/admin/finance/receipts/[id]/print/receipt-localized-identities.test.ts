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
  it('uses the stored French/Latin school branding name and never translates a name', () => {
    expect(identitySource).toContain("'schoolNameLat'");
    expect(identitySource).toContain("'school_name_lat'");
    expect(identitySource).toContain("fetch('/api/admin/school-branding'");
    expect(identitySource).not.toContain('translate(');
    expect(identitySource).not.toContain('translation');
  });

  it('uses the stored student Latin name from the same admin student read contract', () => {
    expect(identitySource).toContain("'name_latin'");
    expect(identitySource).toContain('endpoints.admin.student(studentId)');
    expect(identitySource).toContain('collectReceiptStudentIds');
    expect(pageSource).toContain('identities.studentNames[studentId]');
  });

  it('resolves a payer partner through the student guardian contract before parent detail', () => {
    expect(identitySource).toContain('endpoints.admin.studentGuardians(studentId)');
    expect(identitySource).toContain('guardian.partner_id');
    expect(identitySource).toContain('guardian.person_id');
    expect(identitySource).toContain('fetchParentFrenchNameByGuardianId(guardianId)');
    expect(identitySource).toContain('endpoints.admin.parent(guardianId)');
    expect(identitySource).not.toContain('endpoints.admin.parent(id)');
  });

  it('never treats billing_partner_id as a school.parent id', () => {
    expect(identitySource).toContain('addPartnerId(receipt.billing_partner_id)');
    expect(identitySource).toContain('Only explicit guardian_id values are safe');
    expect(identitySource).not.toContain('addGuardianId(receipt.billing_partner_id)');
  });

  it('keeps Arabic receipt names on the existing receipt data path', () => {
    expect(pageSource).toContain("(lang === 'fr' ? identities.schoolName : null)");
    expect(pageSource).toContain('receipt.actual_payer_name?.trim()');
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
