/**
 * @vitest-environment happy-dom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FamilyRegistrationStepper } from './family-registration-steps';
import { StudentCreatePageHeader } from './student-create-page-header';
import { defaultStudentProfileFormState } from '../utils/student-profile';
import ar from '../../../../../messages/ar.json';

afterEach(() => cleanup());

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    const parts = key.split('.');
    let cur: unknown = ar;
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object') return key;
      cur = (cur as Record<string, unknown>)[part];
    }
    if (typeof cur !== 'string') return key;
    if (!params) return cur;
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
      cur,
    );
  },
}));

describe('family registration design contract', () => {
  it('exposes Arabic administrative labels for family registration steps', () => {
    render(<FamilyRegistrationStepper activeStep="guardians" />);
    expect(screen.getByRole('navigation', { name: /خطوات تسجيل الأسرة/ })).toBeTruthy();
    expect(screen.getByText('الأولياء والمسؤول عن الأداء')).toBeTruthy();
    expect(screen.getByText('الأبناء')).toBeTruthy();
    expect(screen.getByText('مراجعة الأسرة')).toBeTruthy();
  });

  it('links single-student create header to family registration', () => {
    render(<StudentCreatePageHeader state={defaultStudentProfileFormState(null)} />);
    const link = screen.getByRole('link', {
      name: 'تسجيل أسرة كاملة (عدة أبناء)',
    });
    expect(link.getAttribute('href')).toBe('/admin/students/family/new');
  });

  it('exposes finance step labels after registration when on finance step', () => {
    render(<FamilyRegistrationStepper activeStep="finance" />);
    expect(screen.getByText('الوضعية المالية')).toBeTruthy();
    expect(screen.getByText('نتيجة الخطط المالية')).toBeTruthy();
  });

  it('keeps family registration i18n keys without hardcoded journey titles in ar messages', () => {
    const family = ar.admin.student360.familyRegistration;
    expect(family.pageTitle).toBe('تسجيل أسرة كاملة');
    expect(family.confirmRegister).toContain('تأكيد');
    expect(family.sequentialNote).toContain('نجاح جزئي');
    expect(family.errors.ambiguousFailure).toContain('إعادة محاولة');
    expect(family.continueToFinance).toContain('الوضعية المالية');
    expect(family.finance.planNotPaymentNote).toContain('أداء');
    expect(family.finance.status.succeeded).toContain('الخطة');
  });
});
