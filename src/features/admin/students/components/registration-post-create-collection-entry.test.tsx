/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '@/types/user';
import ar from '../../../../../messages/ar.json';

const studentDrawerProps: Array<Record<string, unknown>> = [];
const familyDrawerProps: Array<Record<string, unknown>> = [];

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => {
    const parts = key.split('.');
    let cur: unknown = ar;
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object') return key;
      cur = (cur as Record<string, unknown>)[part];
    }
    return typeof cur === 'string' ? cur : key;
  },
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/features/admin/student-finance/hooks/use-student-family-finance', () => ({
  useStudentFamilyFinanceSummary: vi.fn(() => ({
    data: null,
    loading: false,
    error: null,
    reload: vi.fn(),
  })),
}));

vi.mock('@/features/admin/finance/student-collection-drawer', () => ({
  StudentCollectionDrawer: (props: Record<string, unknown>) => {
    studentDrawerProps.push(props);
    return props.open ? <div data-testid="mock-student-collection-drawer" /> : null;
  },
}));

vi.mock('@/features/admin/finance/family-collection-drawer', () => ({
  FamilyCollectionDrawer: (props: Record<string, unknown>) => {
    familyDrawerProps.push(props);
    return props.open ? <div data-testid="mock-family-collection-drawer" /> : null;
  },
}));

import { useSession } from '@/features/auth/session-context';
import { useStudentFamilyFinanceSummary } from '@/features/admin/student-finance/hooks/use-student-family-finance';
import { RegistrationPostCreateCollectionEntry } from './registration-post-create-collection-entry';
import { StudentCreateResultSection } from './student-create-result-section';

function userWith(perms: string[], caps: string[] = []): CurrentUser {
  return {
    id: 1,
    name: 'Tester',
    email: 't@example.com',
    role: 'admin',
    permissions: perms as CurrentUser['permissions'],
    effective_permissions: perms as CurrentUser['effective_permissions'],
    effective_capabilities: caps,
    school: null,
  };
}

describe('RegistrationPostCreateCollectionEntry', () => {
  beforeEach(() => {
    studentDrawerProps.length = 0;
    familyDrawerProps.length = 0;
    vi.mocked(useSession).mockReset();
    vi.mocked(useStudentFamilyFinanceSummary).mockReset();
    vi.mocked(useStudentFamilyFinanceSummary).mockReturnValue({
      data: null,
      loading: false,
      error: null,
      reload: vi.fn(),
      initialLoading: false,
      fetching: false,
    });
  });

  afterEach(() => cleanup());

  it('hides collect action without finance.collect_payments', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['students.create'], ['students.create']));
    render(<RegistrationPostCreateCollectionEntry succeededStudentIds={[9]} />);
    expect(screen.queryByTestId('registration-collect-payment')).toBeNull();
  });

  it('shows collect action with finance.collect_payments and opens student drawer', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['finance.collect_payments']));
    render(<RegistrationPostCreateCollectionEntry succeededStudentIds={[9]} />);
    expect(screen.getByTestId('registration-collect-payment').textContent).toContain(
      'تسجيل تحصيل',
    );
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    expect(screen.getByTestId('mock-student-collection-drawer')).toBeTruthy();
    expect(studentDrawerProps.at(-1)?.studentId).toBe(9);
  });

  it('opens one family drawer for multi-child official family account', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['finance.collect_payments']));
    vi.mocked(useStudentFamilyFinanceSummary).mockReturnValue({
      data: {
        family_id: 70,
        billing_partner_id: 70,
        display_name: 'أسرة تجريبية',
        student_count: 2,
        children: [
          { student_id: 1, services_summary: [] },
          { student_id: 2, services_summary: [] },
        ],
      },
      loading: false,
      error: null,
      reload: vi.fn(),
      initialLoading: false,
      fetching: false,
    });

    render(
      <RegistrationPostCreateCollectionEntry succeededStudentIds={[1, 2]} studentNameById={{ 1: 'أ' }} />,
    );
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    expect(screen.getByTestId('mock-family-collection-drawer')).toBeTruthy();
    expect(familyDrawerProps.at(-1)?.familyId).toBe(70);
    expect(familyDrawerProps.at(-1)?.navigateToReceiptOnSuccess).toBe(false);
    expect(screen.queryByTestId('mock-student-collection-drawer')).toBeNull();
  });

  it('keeps registration success visible and does not open drawer when billing unresolved', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['finance.collect_payments']));
    render(
      <StudentCreateResultSection
        result={{
          studentId: 12,
          financeAttached: true,
          financeActivation: 'activate',
          billingUnresolved: true,
          collectionAllowed: false,
        }}
        onOpenStudent360={() => undefined}
        onCreateAnother={() => undefined}
        onBackToList={() => undefined}
      />,
    );

    expect(screen.getByTestId('student-create-result')).toBeTruthy();
    expect(screen.getByText('تم تسجيل التلميذ بنجاح.')).toBeTruthy();
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    expect(screen.getByTestId('registration-collect-unavailable')).toBeTruthy();
    expect(screen.queryByTestId('mock-student-collection-drawer')).toBeNull();
  });

  it('uses adopted Arabic collection terms without payment wording', () => {
    const keys = ar.admin.student360.registrationCollection;
    expect(keys.collectAction).toBe('تسجيل تحصيل');
    expect(keys.cancelledKeepRegistration).toContain('تحصيل');
    expect(keys.collectAction).not.toContain('دفع');
    expect(keys.optionalHint).not.toContain('دفعة');
    expect(keys.successBody).not.toContain('المسدد');
  });
});
