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

  it('walks only known nested identity containers so student and parent bilingual fields are reachable', () => {
    expect(identitySource).toContain('const IDENTITY_CONTAINER_KEYS');
    expect(identitySource).toContain("'identity'");
    expect(identitySource).toContain("'person'");
    expect(identitySource).toContain("'student'");
    expect(identitySource).toContain("'guardian'");
    expect(identitySource).toContain("'branding'");
    expect(identitySource).toContain('if (next.depth >= 3) continue;');
    expect(identitySource).toContain('for (const candidate of identityRecords(value))');
  });

  it('uses the stored student Latin/French field and then the fresh exact entity name', () => {
    expect(identitySource).toContain("'name_latin'");
    expect(identitySource).toContain('export function readStudentFrenchName');
    expect(identitySource).toContain('readCurrentEntityName(root.student)');
    expect(identitySource).toContain('readCurrentEntityName(root)');
    expect(identitySource).toContain('endpoints.admin.student(studentId)');
    expect(identitySource).toContain('collectReceiptStudentIds');
    expect(pageSource).toContain('identities.studentNames[studentId]');
  });

  it('prefers stored parent name_fr and accepts the fresh parent detail name before receipt fallback', () => {
    expect(identitySource).toContain("'name_fr'");
    expect(identitySource).toContain('export function readParentFrenchName');
    expect(identitySource).toContain('readFrenchStoredName(data) ?? readCurrentEntityName(data)');
    expect(identitySource).not.toContain('normalizeParentProfile');
    expect(identitySource).not.toContain('normalizeParentProfile(data)?.name');
  });

  it('refreshes current bilingual names instead of letting historical receipt identity short-circuit them', () => {
    expect(identitySource).toContain('fetchSchoolFrenchName(),');
    expect(identitySource).toContain('fetchPayerFrenchName(receipt, rawReceipt, studentIds)');
    expect(identitySource).toContain('const freshName = await fetchStudentFrenchName(studentId);');
    expect(identitySource).toContain('schoolName: freshSchoolName ?? initial.schoolName');
    expect(identitySource).toContain('payerName: freshPayerName ?? initial.payerName');
  });

  it('keeps historical receipt snapshots strict while fresh entity reads may use current names', () => {
    expect(identitySource).toContain('const name = readFrenchStoredName(candidate);');
    expect(identitySource).toContain(
      'return readFrenchStoredName(snapshot.school) ?? readFrenchStoredName(raw.school);',
    );
    expect(identitySource).toContain(
      'return readFrenchStoredName(data) ?? readCurrentEntityName(data);',
    );
  });

  it('keeps guardian and billing-partner id namespaces separate', () => {
    expect(identitySource).toContain('export function payerIdentityRefs');
    expect(identitySource).toContain('addPartner(receipt.billing_partner_id)');
    expect(identitySource).not.toContain('addGuardian(receipt.billing_partner_id)');
    expect(identitySource).toContain('endpoints.admin.studentGuardians(studentId)');
    expect(identitySource).toContain('fetchParentFrenchNameByGuardianId(guardianId)');
    expect(identitySource).toContain('endpoints.admin.parent(guardianId)');
  });

  it('uses the resolved current payer name and keeps receipt data as final fallback', () => {
    expect(identitySource).toContain('readParentFrenchName(matched)');
    expect(identitySource).toContain('readParentFrenchName(response.data)');
    expect(pageSource).toContain("(lang === 'fr' ? identities.payerName : null)");
    expect(pageSource).toContain('receipt.actual_payer_name?.trim()');
  });

  it('keeps Arabic receipt names on the existing receipt data path', () => {
    expect(pageSource).toContain("(lang === 'fr' ? identities.schoolName : null)");
    expect(pageSource).toContain("const rows = lang === 'fr'");
    expect(pageSource).toContain(': baseRows;');
  });

  it('waits for current French identity hydration before preview or printing', () => {
    expect(pageSource).toContain('const frenchPreviewReady =');
    expect(pageSource).toContain('identities.ready &&');
    expect(pageSource).toContain('frenchReadyReceiptId === receipt.id');
    expect(pageSource).toContain("(lang === 'fr' && !frenchPreviewReady)");
    expect(pageSource).toContain("disabled={lang === 'fr' && !frenchPreviewReady}");
    expect(pageSource).toContain('receipt && canPrint && frenchPreviewReady ? (');
    expect(pageSource).toContain('useReceiptFrenchIdentities(receipt, state.data');
  });

  it('preserves the fixed A5 double-copy and dense split contract', () => {
    expect(pageSource).toContain('data-layout="double"');
    expect(pageSource).toContain('const splitTable = rows.length > 6');
    expect(pageSource).toContain('const splitIndex = Math.ceil(rows.length / 2)');
    expect(pageSource.match(/<section className="receipt-total-card">/g)?.length).toBe(1);
  });
});
