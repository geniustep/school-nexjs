import { describe, expect, it } from 'vitest';
import {
  normalizedStudentImportDetailValue,
  rawStudentImportDetailEntries,
} from './student-import-row-details';
import type { StudentImportRowResult } from './student-import-types';

function row(): StudentImportRowResult {
  return {
    rowNumber: 1,
    raw: {
      first_name: 'Amira',
      last_name: 'Bouzid',
      first_name_ar: 'أميرة',
      last_name_ar: 'بوزيد',
      first_name_fr: 'Amira',
      last_name_fr: 'Bouzid',
      school_label: 'مدرسة ألواح · ecole-alwah',
      academic_year_label: 'السنة الدراسية 2026 - 2027',
      level_label: 'الأولى ابتدائي',
      class_label: '1APG-1 · الأولى ابتدائي · السنة الدراسية 2026 - 2027',
      guardian_name: 'بوزيد',
      guardian_mobile: '0666975629',
      guardian_relationship_type: 'father',
      guardian_is_legal_guardian: true,
      guardian_is_primary_contact: true,
      guardian_is_financial_responsible: true,
    },
    normalized: {
      first_name: 'Amira',
      last_name: 'Bouzid',
      first_name_ar: 'أميرة',
      last_name_ar: 'بوزيد',
      first_name_fr: 'Amira',
      last_name_fr: 'Bouzid',
      school_id: 1,
      academic_year_id: 1,
      level_id: 25,
      class_id: 13,
      guardian_name: 'بوزيد',
      guardian_mobile: '0666975629',
      guardian_relationship_type: 'father',
      guardian_is_legal_guardian: true,
      guardian_is_primary_contact: true,
      guardian_is_financial_responsible: true,
    },
    errors: [],
    warnings: [],
    status: 'valid',
  };
}

describe('student import row details', () => {
  it('derives bilingual names from split v2 fields', () => {
    const value = row();
    expect(normalizedStudentImportDetailValue(value, 'name_ar')).toBe('أميرة بوزيد');
    expect(normalizedStudentImportDetailValue(value, 'name_latin')).toBe('Amira Bouzid');
  });

  it('shows label-based enrollment values used by the v1/v2 workbook contract', () => {
    const value = row();
    expect(normalizedStudentImportDetailValue(value, 'school_code')).toBe('مدرسة ألواح · ecole-alwah');
    expect(normalizedStudentImportDetailValue(value, 'academic_year_code')).toBe('السنة الدراسية 2026 - 2027');
    expect(normalizedStudentImportDetailValue(value, 'level_code')).toBe('الأولى ابتدائي');
    expect(normalizedStudentImportDetailValue(value, 'class_code')).toContain('1APG-1');
  });

  it('keeps guardian role flags visible in normalized details', () => {
    const value = row();
    expect(normalizedStudentImportDetailValue(value, 'guardian_name')).toBe('بوزيد');
    expect(normalizedStudentImportDetailValue(value, 'guardian_mobile')).toBe('0666975629');
    expect(normalizedStudentImportDetailValue(value, 'guardian_is_legal_guardian')).toBe(true);
    expect(normalizedStudentImportDetailValue(value, 'guardian_is_primary_contact')).toBe(true);
    expect(normalizedStudentImportDetailValue(value, 'guardian_is_financial_responsible')).toBe(true);
  });

  it('renders raw details from the actual uploaded keys instead of the legacy column list', () => {
    const entries = Object.fromEntries(rawStudentImportDetailEntries(row().raw));
    expect(entries.first_name_ar).toBe('أميرة');
    expect(entries.last_name_ar).toBe('بوزيد');
    expect(entries.guardian_mobile).toBe('0666975629');
    expect(entries).not.toHaveProperty('name_ar');
  });
});
