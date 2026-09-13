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

describe('French receipt live regression guards', () => {
  it('keeps payer identity lookup out of related student records', () => {
    expect(identitySource).toContain('const PARENT_IDENTITY_CONTAINER_KEYS');
    expect(identitySource).toContain('function parentIdentityView');
    expect(identitySource).toContain('const data = parentIdentityView(rawData);');
    expect(identitySource).toContain('readParentFrenchName(candidate)');
    const parentContainers = identitySource.slice(
      identitySource.indexOf('const PARENT_IDENTITY_CONTAINER_KEYS'),
      identitySource.indexOf('const PARENT_SCALAR_KEYS'),
    );
    expect(parentContainers).not.toContain("'student'");
  });

  it('uses current school branding code for the French logo', () => {
    expect(identitySource).toContain('schoolCode: string | null;');
    expect(identitySource).toContain('fetchSchoolCode(),');
    expect(identitySource).toContain('schoolCode: freshSchoolCode ?? initial.schoolCode');
    expect(pageSource).toContain("(lang === 'fr' ? identities.schoolCode : null)");
    expect(pageSource).toContain('/api/public/school-branding/logo?school_code=');
  });

  it('compacts adjacent duplicate service segments only in French display', () => {
    expect(pageSource).toContain('function compactFrenchServiceLabel');
    expect(pageSource).toContain("return lang === 'fr' ? compactFrenchServiceLabel(raw) : raw;");
    expect(pageSource).toContain('const service = serviceDisplayLabel(row, lang);');
    expect(pageSource).toContain('<span role="cell" dir="auto">{service}</span>');
  });
});
