/**
 * @vitest-environment happy-dom
 *
 * Integration QA harness for REG_FIN_JOURNEY_INTEGRATION_QA_3.
 * Uses fixtures/mocks only — no live registration or collection mutations.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '@/types/user';
import type { PaymentCollection } from '@/types/finance';
import type { FamilyCollectionCreateResponse } from '@/types/family-finance';
import ar from '../../../../../messages/ar.json';

const studentDrawerProps: Array<Record<string, unknown>> = [];
const familyDrawerProps: Array<Record<string, unknown>> = [];
const windowOpenSpy = vi.fn();

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
    initialLoading: false,
    fetching: false,
  })),
}));

vi.mock('@/features/admin/finance/student-collection-drawer', () => ({
  StudentCollectionDrawer: (props: Record<string, unknown>) => {
    studentDrawerProps.push(props);
    if (!props.open) return null;
    return (
      <div data-testid="mock-student-collection-drawer">
        <button
          type="button"
          data-testid="mock-student-collection-cancel"
          onClick={() => (props.onClose as () => void)()}
        >
          cancel
        </button>
        <button
          type="button"
          data-testid="mock-student-collection-succeed-with-receipt"
          onClick={() =>
            (props.onSuccess as (c: PaymentCollection) => void)({
              id: 501,
              receipt_id: 901,
            } as PaymentCollection)
          }
        >
          succeed-receipt
        </button>
        <button
          type="button"
          data-testid="mock-student-collection-succeed-without-receipt"
          onClick={() =>
            (props.onSuccess as (c: PaymentCollection) => void)({
              id: 502,
              receipt_id: null,
            } as PaymentCollection)
          }
        >
          succeed-no-receipt
        </button>
      </div>
    );
  },
}));

vi.mock('@/features/admin/finance/family-collection-drawer', () => ({
  FamilyCollectionDrawer: (props: Record<string, unknown>) => {
    familyDrawerProps.push(props);
    if (!props.open) return null;
    return (
      <div data-testid="mock-family-collection-drawer">
        <button
          type="button"
          data-testid="mock-family-collection-cancel"
          onClick={() => (props.onClose as () => void)()}
        >
          cancel
        </button>
        <button
          type="button"
          data-testid="mock-family-collection-succeed"
          onClick={() =>
            (props.onSuccess as (r: FamilyCollectionCreateResponse) => void)({
              collection_id: 700,
              receipt_id: 800,
              collections: [],
              receipts: [{ id: 800 }],
              warnings: [],
            })
          }
        >
          succeed
        </button>
      </div>
    );
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

describe('RegistrationPostCreateCollectionEntry — Integration QA harness', () => {
  beforeEach(() => {
    studentDrawerProps.length = 0;
    familyDrawerProps.length = 0;
    windowOpenSpy.mockReset();
    vi.stubGlobal('open', windowOpenSpy);
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

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('hides collect action without finance.collect_payments and keeps create result usable', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['students.create'], ['students.create']));
    render(
      <StudentCreateResultSection
        result={{ studentId: 9, financeAttached: false }}
        onOpenStudent360={() => undefined}
        onCreateAnother={() => undefined}
        onBackToList={() => undefined}
      />,
    );
    expect(screen.getByTestId('student-create-result')).toBeTruthy();
    expect(screen.getByText('تم تسجيل التلميذ بنجاح.')).toBeTruthy();
    expect(screen.queryByTestId('registration-collect-payment')).toBeNull();
    expect(screen.getByTestId('student-create-open-360')).toBeTruthy();
  });

  it('shows optional collect after success and opens student drawer with official studentId', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['finance.collect_payments']));
    render(<RegistrationPostCreateCollectionEntry succeededStudentIds={[9]} />);
    expect(screen.getByTestId('registration-post-create-collection').getAttribute('data-phase')).toBe(
      'idle',
    );
    expect(screen.getByText(/التحصيل اختياري/)).toBeTruthy();
    expect(screen.getByTestId('registration-collect-payment').textContent).toContain('تسجيل تحصيل');
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    expect(screen.getByTestId('mock-student-collection-drawer')).toBeTruthy();
    expect(studentDrawerProps.at(-1)?.studentId).toBe(9);
  });

  it('keeps registration success and shows cancelled message when drawer closes without collection', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['finance.collect_payments']));
    render(
      <StudentCreateResultSection
        result={{ studentId: 12, financeAttached: true, financeActivation: 'activate' }}
        onOpenStudent360={() => undefined}
        onCreateAnother={() => undefined}
        onBackToList={() => undefined}
      />,
    );
    expect(screen.getByText('تم تسجيل التلميذ بنجاح.')).toBeTruthy();
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    fireEvent.click(screen.getByTestId('mock-student-collection-cancel'));
    expect(screen.getByTestId('student-create-result')).toBeTruthy();
    expect(screen.getByTestId('registration-collect-cancelled').textContent).toContain(
      'تم التسجيل بنجاح، ولم يُسجل أي تحصيل.',
    );
    expect(screen.getByTestId('registration-post-create-collection').getAttribute('data-phase')).toBe(
      'cancelled',
    );
  });

  it('shows official receipt link after mocked collection success and does not invent a receipt', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['finance.collect_payments']));
    render(<RegistrationPostCreateCollectionEntry succeededStudentIds={[9]} />);
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    fireEvent.click(screen.getByTestId('mock-student-collection-succeed-with-receipt'));
    expect(screen.getByTestId('registration-collect-succeeded')).toBeTruthy();
    const receipt = screen.getByTestId('registration-collect-receipt-link');
    expect(receipt.getAttribute('href')).toBe('/admin/finance/receipts/901');
    expect(screen.queryByTestId('registration-collect-receipt-unavailable')).toBeNull();
  });

  it('keeps collection success without receipt and retries lookup without re-opening drawer', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['finance.collect_payments']));
    render(<RegistrationPostCreateCollectionEntry succeededStudentIds={[9]} />);
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    fireEvent.click(screen.getByTestId('mock-student-collection-succeed-without-receipt'));
    expect(screen.getByTestId('registration-collect-receipt-unavailable').textContent).toContain(
      'سُجل التحصيل بنجاح، ويتعذر تحميل الوصل حاليًا.',
    );
    expect(screen.queryByTestId('mock-student-collection-drawer')).toBeNull();
    fireEvent.click(screen.getByTestId('registration-collect-receipt-retry'));
    expect(windowOpenSpy).toHaveBeenCalledWith(
      '/admin/finance/collections/502',
      '_blank',
      'noopener,noreferrer',
    );
    expect(screen.queryByTestId('mock-student-collection-drawer')).toBeNull();
  });

  it('opens one family drawer for official multi-child account and stays on result page', () => {
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
      <RegistrationPostCreateCollectionEntry
        succeededStudentIds={[1, 2]}
        studentNameById={{ 1: 'أ' }}
      />,
    );
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    expect(screen.getByTestId('mock-family-collection-drawer')).toBeTruthy();
    expect(familyDrawerProps.at(-1)?.familyId).toBe(70);
    expect(familyDrawerProps.at(-1)?.navigateToReceiptOnSuccess).toBe(false);
    expect(screen.queryByTestId('mock-student-collection-drawer')).toBeNull();
    fireEvent.click(screen.getByTestId('mock-family-collection-succeed'));
    expect(screen.getByTestId('registration-collect-receipt-link').getAttribute('href')).toBe(
      '/admin/finance/receipts/800',
    );
  });

  it('does not open a broken drawer when billing is unresolved', () => {
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
    expect(screen.getByText('تم تسجيل التلميذ بنجاح.')).toBeTruthy();
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    expect(screen.getByTestId('registration-collect-unavailable')).toBeTruthy();
    expect(screen.queryByTestId('mock-student-collection-drawer')).toBeNull();
  });

  it('does not invent family context for multi-child without official account', () => {
    vi.mocked(useSession).mockReturnValue(userWith(['finance.collect_payments']));
    render(<RegistrationPostCreateCollectionEntry succeededStudentIds={[1, 2]} />);
    fireEvent.click(screen.getByTestId('registration-collect-payment'));
    expect(screen.getByTestId('registration-collect-unavailable').textContent).toContain(
      'تعذر تحديد الحساب المالي الرسمي',
    );
    expect(screen.queryByTestId('mock-family-collection-drawer')).toBeNull();
    expect(screen.queryByTestId('mock-student-collection-drawer')).toBeNull();
  });

  it('uses adopted Arabic collection terms without payment wording', () => {
    const keys = ar.admin.student360.registrationCollection;
    expect(keys.collectAction).toBe('تسجيل تحصيل');
    expect(keys.cancelledKeepRegistration).toContain('تحصيل');
    expect(keys.failedKeepRegistration).toContain('تم التسجيل بنجاح');
    expect(keys.collectAction).not.toContain('دفع');
    expect(keys.optionalHint).not.toContain('دفعة');
    expect(keys.successBody).not.toContain('المسدد');
    expect(keys.openReceipt).toContain('الوصل');
  });
});
