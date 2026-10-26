import { describe, expect, it } from 'vitest';
import { parseSchoolYearEnrollmentEconomics } from './school-year-economics-contract';
const sample = {
  current_students_count: 3, registration_net: 1000, tuition_net: 24000,
  combined_net: 25000, average_per_current_student: 8333.33,
  currency: 'MAD', academic_year_id: 7, as_of_date: '2026-10-26',
  student_basis: 'operationally_active', fee_basis: 'net_non_cancelled_registration_tuition',
  semantics: { nature: 'annual_fee_stock' },
};
describe('school year enrollment economics', () => {
  it('reads backend amounts without client recomputation', () => {
    expect(parseSchoolYearEnrollmentEconomics(sample, 7)).toEqual(sample);
  });
  it('rejects an academic year mismatch or unresolved year', () => {
    expect(parseSchoolYearEnrollmentEconomics(sample, 9)).toBeNull();
    expect(parseSchoolYearEnrollmentEconomics(sample, null)).toBeNull();
  });
  it('accepts an empty year only with a null average', () => {
    const empty = { ...sample, current_students_count: 0, registration_net: 0,
      tuition_net: 0, combined_net: 0, average_per_current_student: null };
    expect(parseSchoolYearEnrollmentEconomics(empty, 7)).toEqual(empty);
    expect(parseSchoolYearEnrollmentEconomics({ ...empty, average_per_current_student: 0 }, 7)).toBeNull();
  });
  it('does not expose malformed financial data', () => {
    expect(parseSchoolYearEnrollmentEconomics({ ...sample, combined_net: NaN }, 7)).toBeNull();
    expect(parseSchoolYearEnrollmentEconomics({ ...sample, tuition_net: undefined }, 7)).toBeNull();
    expect(parseSchoolYearEnrollmentEconomics({ ...sample, average_per_current_student: Infinity }, 7)).toBeNull();
  });
  it('requires backend currency and as-of date, accepting non-MAD schools', () => {
    expect(parseSchoolYearEnrollmentEconomics({ ...sample, currency: '' }, 7)).toBeNull();
    expect(parseSchoolYearEnrollmentEconomics({ ...sample, as_of_date: null }, 7)).toBeNull();
    expect(parseSchoolYearEnrollmentEconomics({ ...sample, currency: 'EUR' }, 7)?.currency).toBe('EUR');
  });
  it('fails closed for missing or unsafe data', () => {
    expect(parseSchoolYearEnrollmentEconomics(null, 7)).toBeNull();
    expect(parseSchoolYearEnrollmentEconomics({ ...sample, current_students_count: -1 }, 7)).toBeNull();
    expect(parseSchoolYearEnrollmentEconomics({ ...sample, semantics: null }, 7)).toBeNull();
  });
});
