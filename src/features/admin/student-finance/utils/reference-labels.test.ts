import { describe, expect, it } from 'vitest';
import { resolveFinanceDisplayLabel } from './reference-labels';

const AR_REF: Record<string, string> = {
  'admin.student360.financeOps.ref.service_category.registration': 'التسجيل',
  'admin.student360.financeOps.ref.service_category.tuition': 'التمدرس',
  'admin.student360.financeOps.ref.service_category.transport': 'النقل',
  'admin.student360.financeOps.ref.commitment_type.one_time': 'مرة واحدة',
  'admin.student360.financeOps.ref.commitment_type.renewable_subscription': 'اشتراك متجدد',
  'admin.student360.financeOps.ref.pricing_unit.academic_year': 'السنة الدراسية',
  'admin.student360.financeOps.ref.pricing_unit.month': 'شهر',
};

function arT(key: string): string {
  return AR_REF[key] ?? key;
}

describe('resolveFinanceDisplayLabel', () => {
  it('prefers Arabic i18n over English API option labels', () => {
    const englishOptions = [{ value: 'tuition', label: 'Tuition' }];
    expect(resolveFinanceDisplayLabel(arT, 'service_category', 'Tuition', englishOptions)).toBe('التمدرس');
    expect(resolveFinanceDisplayLabel(arT, 'service_category', 'Registration', englishOptions)).toBe('التسجيل');
    expect(resolveFinanceDisplayLabel(arT, 'service_category', 'Transport', englishOptions)).toBe('النقل');
  });

  it('does not surface raw English commitment and pricing labels', () => {
    expect(resolveFinanceDisplayLabel(arT, 'commitment_type', 'One Time')).toBe('مرة واحدة');
    expect(resolveFinanceDisplayLabel(arT, 'commitment_type', 'Renewable Subscription')).toBe('اشتراك متجدد');
    expect(resolveFinanceDisplayLabel(arT, 'pricing_unit', 'Academic Year')).toBe('السنة الدراسية');
    expect(resolveFinanceDisplayLabel(arT, 'pricing_unit', 'Month')).toBe('شهر');
  });
});
