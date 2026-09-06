/**
 * Shared resource hook defaults must stay keepPreviousData=true unless opted out.
 * Admissions passes keepPreviousData:false explicitly; other consumers keep previous rows.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('shared useResource / useAdminResource SSOT options', () => {
  const resourceSrc = readFileSync(
    resolve(__dirname, '../../../../lib/hooks/use-resource.ts'),
    'utf8',
  );
  const adminSrc = readFileSync(
    resolve(__dirname, '../../../../lib/hooks/use-admin-resource.ts'),
    'utf8',
  );
  const admissionsListSrc = readFileSync(
    resolve(__dirname, '../components/admissions-list-page.tsx'),
    'utf8',
  );
  const studentsListSrc = readFileSync(
    resolve(__dirname, '../../students/hooks/use-students-list-resource.ts'),
    'utf8',
  );
  const financeSrc = readFileSync(
    resolve(__dirname, '../../finance/receipts-list-panel.tsx'),
    'utf8',
  );

  it('default keepPreviousData remains true (opt-in false only)', () => {
    expect(resourceSrc).toContain('keepPreviousData?: boolean');
    expect(resourceSrc).toContain('options?.keepPreviousData !== false');
    expect(resourceSrc).toContain('if (!keepPreviousData)');
  });

  it('useAdminResource forwards UseResourceOptions without forcing false', () => {
    expect(adminSrc).toContain('options?: UseResourceOptions');
    expect(adminSrc).toMatch(/useResource<[^>]+>\(effectivePath, mergedQuery, options\)/);
    expect(adminSrc).not.toMatch(/keepPreviousData:\s*false/);
  });

  it('Admissions list opts out of keepPreviousData; students/finance do not', () => {
    expect(admissionsListSrc).toContain('keepPreviousData: false');
    expect(studentsListSrc).not.toContain('keepPreviousData: false');
    expect(financeSrc).not.toContain('keepPreviousData: false');
  });

  it('path null clears meta as well as data (safe for all consumers)', () => {
    expect(resourceSrc).toMatch(/if \(!path\) \{[\s\S]*setMeta\(null\)/);
  });
});
