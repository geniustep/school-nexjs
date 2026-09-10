import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readStoredLatinName } from './receipt-french-entity-names';

describe('French HTML receipt entity names', () => {
  it('reads the canonical stored Latin student name without translating it', () => {
    expect(readStoredLatinName({ name: 'ياسين العلوي', name_latin: 'Yassine Alaoui' })).toBe(
      'Yassine Alaoui',
    );
  });

  it('reads unified-person and school-branding Latin names', () => {
    expect(readStoredLatinName({ person: { name_latin: 'Ahmed Benali' } })).toBe('Ahmed Benali');
    expect(readStoredLatinName({ school_name_lat: 'École Al Wahda' })).toBe('École Al Wahda');
    expect(readStoredLatinName({ schoolNameLat: 'École Al Wahda' })).toBe('École Al Wahda');
  });

  it('does not invent a French name when only the generic name exists', () => {
    expect(readStoredLatinName({ name: 'محمد الأمين' })).toBeUndefined();
  });

  it('wires localized names into French receipt rendering while preserving A5 split rules', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app/admin/finance/receipts/[id]/print/page.tsx'),
      'utf8',
    );

    expect(source).toContain('loadReceiptFrenchEntityNames(receipt, state.data)');
    expect(source).toContain("lang === 'fr' && frenchNames.payerName");
    expect(source).toContain("lang === 'fr' && frenchNames.schoolName");
    expect(source).toContain('frenchNames.students[row.studentDisplay.id]');
    expect(source).toContain('const splitTable = rows.length > 6;');
    expect(source).toContain('data-layout="double"');
  });
});
