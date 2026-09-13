import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readCurrentEntityName,
  readFrenchStoredName,
} from './receipt-french-name-reader';

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
  it('reads the exact school French name returned by the branding settings contract', () => {
    expect(readFrenchStoredName({ schoolNameLat: 'École Alwah' })).toBe('École Alwah');
    expect(readFrenchStoredName({ data: { school: { school_name_lat: 'École Alwah' } } })).toBe(
      'École Alwah',
    );
    expect(identitySource).toContain("fetch('/api/admin/school-branding'");
    expect(identitySource).toContain('endpoints.admin.schoolBranding');
  });

  it('reads stored student name_latin through real admin detail envelopes', () => {
    expect(readFrenchStoredName({ student: { name_latin: 'Yassine El Amrani' } })).toBe(
      'Yassine El Amrani',
    );
    expect(
      readFrenchStoredName({ data: { student: { name_latin: 'Yassine El Amrani' } } }),
    ).toBe('Yassine El Amrani');
    expect(identitySource).toContain('endpoints.admin.student(studentId)');
    expect(identitySource).toContain('collectReceiptStudentIds');
    expect(pageSource).toContain('identities.studentNames[studentId]');
  });

  it('reads stored parent French/Latin identities from nested parent/person profiles', () => {
    expect(readFrenchStoredName({ parent: { name_latin: 'Ahmed Benali' } })).toBe('Ahmed Benali');
    expect(
      readFrenchStoredName({ data: { parent: { person: { name_fr: 'Ahmed Benali' } } } }),
    ).toBe('Ahmed Benali');
    expect(
      readFrenchStoredName({ guardian_profile: { person: { full_name_latin: 'Ahmed Benali' } } }),
    ).toBe('Ahmed Benali');
    expect(identitySource).toContain('endpoints.admin.parent(guardianId)');
  });

  it('accepts string ids from receipt snapshots without mixing guardian and partner namespaces', () => {
    expect(identitySource).toContain("typeof value === 'string'");
    expect(identitySource).toContain('addPartner(receipt.billing_partner_id)');
    expect(identitySource).not.toContain('addGuardian(receipt.billing_partner_id)');
    expect(identitySource).toContain('endpoints.admin.studentGuardians(studentId)');
  });

  it('never translates a stored identity and keeps current entity name as compatibility fallback only', () => {
    expect(readFrenchStoredName({ name: 'الاسم العربي' })).toBeNull();
    expect(readCurrentEntityName({ data: { person: { name: 'Ahmed Benali' } } })).toBe(
      'Ahmed Benali',
    );
    expect(identitySource).not.toContain('translate(');
  });

  it('uses resolved French identities while keeping receipt data as final fallback', () => {
    expect(pageSource).toContain("(lang === 'fr' ? identities.schoolName : null)");
    expect(pageSource).toContain("(lang === 'fr' ? identities.payerName : null)");
    expect(pageSource).toContain('receipt.actual_payer_name?.trim()');
    expect(pageSource).toContain("const rows = lang === 'fr'");
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
