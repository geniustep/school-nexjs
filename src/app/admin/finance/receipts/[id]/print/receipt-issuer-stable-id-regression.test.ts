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

const identitySource = readFileSync(join(printDir, 'receipt-localized-identities.ts'), 'utf8');
const pageSource = readFileSync(join(printDir, 'page.tsx'), 'utf8');

describe('French receipt issuer stable identity contract', () => {
  it('models the additive Odoo issuer identity contract locally', () => {
    expect(identitySource).toContain('type ReceiptIssuerIdentityContract');
    expect(identitySource).toContain('issued_by_user_id?: number | null;');
    expect(identitySource).toContain('issued_by_name?: string | null;');
  });

  it('prefers issued_by_user_id before every historical issued_by fallback', () => {
    const stableReceipt = identitySource.indexOf('positiveId(receiptContract.issued_by_user_id)');
    const stableRaw = identitySource.indexOf('positiveId(raw.issued_by_user_id)');
    const compatibilityLoop = identitySource.indexOf(
      'for (const candidate of [receipt.issued_by, raw.issued_by])',
    );

    expect(stableReceipt).toBeGreaterThan(-1);
    expect(stableRaw).toBeGreaterThan(stableReceipt);
    expect(compatibilityLoop).toBeGreaterThan(stableRaw);
  });

  it('resolves the stable user id through the existing Staff endpoint and canonical name_fr', () => {
    expect(identitySource).toContain('const userId = receiptIssuerUserId(receipt, rawReceipt);');
    expect(identitySource).toContain('endpoints.admin.staffMember(userId)');
    expect(identitySource).toContain('unwrapStaffDetailResponse(response.data)');
    expect(identitySource).toContain('cleanString(member.name_fr) ?? readStaffFrenchName(member)');
  });

  it('keeps graceful compatibility display fallbacks without using them as the canonical id', () => {
    expect(identitySource).toContain('cleanString(receiptContract.issued_by_name)');
    expect(identitySource).toContain('cleanString(raw.issued_by_name)');
    expect(identitySource).toContain('if (!userId) return null;');
    expect(identitySource).toContain('} catch {\n    return null;\n  }');
  });

  it('uses the localized issuer only for French while Arabic stays on the existing receipt path', () => {
    expect(pageSource).toContain(
      "const issuer = (lang === 'fr' ? identities.issuerName : null) || issuedByName(receipt);",
    );
  });

  it('preserves the canonical parent-detail regression fix', () => {
    const canonicalParentRead = identitySource.indexOf(
      'const name = await fetchParentFrenchNameByGuardianId(guardianId);',
    );
    const inlineRelationshipFallback = identitySource.indexOf(
      'const inlineName = readParentFrenchName(matched);',
    );

    expect(canonicalParentRead).toBeGreaterThan(-1);
    expect(inlineRelationshipFallback).toBeGreaterThan(canonicalParentRead);
  });
});