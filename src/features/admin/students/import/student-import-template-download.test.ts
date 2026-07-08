import { describe, expect, it } from 'vitest';
import { buildStudentImportTemplatePath } from './student-import-template-download';

describe('student import template download', () => {
  it('builds template path without academic year', () => {
    expect(buildStudentImportTemplatePath()).toBe('/admin/students/import/template');
    expect(buildStudentImportTemplatePath(null)).toBe('/admin/students/import/template');
  });

  it('builds template path with academic_year_id query', () => {
    expect(buildStudentImportTemplatePath(2026)).toBe(
      '/admin/students/import/template?academic_year_id=2026',
    );
  });
});
