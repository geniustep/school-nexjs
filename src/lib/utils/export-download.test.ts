import { describe, expect, it } from 'vitest';
import { buildOfficialExportUrl } from './export-download';

describe('buildOfficialExportUrl', () => {
  it('keeps the legacy URL when no query is supplied', () => {
    expect(buildOfficialExportUrl('/api/v1/admin/exams/export')).toBe(
      '/api/odoo/api/v1/admin/exams/export',
    );
  });

  it('adds an explicit academic year without changing the export path', () => {
    expect(
      buildOfficialExportUrl('/api/v1/admin/exams/export', {
        academic_year_id: 42,
      }),
    ).toBe('/api/odoo/api/v1/admin/exams/export?academic_year_id=42');
  });

  it('merges with existing params and ignores undefined values', () => {
    expect(
      buildOfficialExportUrl('/api/v1/admin/exams/export?state=draft', {
        academic_year_id: 42,
        class_id: undefined,
      }),
    ).toBe('/api/odoo/api/v1/admin/exams/export?state=draft&academic_year_id=42');
  });
});
