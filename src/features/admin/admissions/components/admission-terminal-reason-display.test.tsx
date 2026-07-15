// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { AdmissionDetail, AdmissionListItem } from '@/types/admission';
import { AdmissionCard } from './admission-card';
import { AdmissionPrimaryActionPanel } from './admission-primary-action-panel';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 3 }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock('./admission-list-actions-menu', () => ({
  AdmissionListActionsMenu: () => (
    <button type="button" aria-label="إجراءات الطلب">
      ⋯
    </button>
  ),
}));

type ListSeed = AdmissionListItem & {
  rejection?: { is_rejected: boolean; reason?: string | false | null } | null;
  lost_reason?: string | false | null;
};

function listItem(overrides: Partial<ListSeed> = {}): AdmissionListItem {
  return {
    id: 100,
    student_name: 'Test Child',
    state: 'new',
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    assigned_user: null,
    priority: null,
    source: null,
    requested_level: null,
    guardian_name: null,
    guardian_phone: null,
    reference: 'ADM-100',
    ...overrides,
  } as AdmissionListItem;
}

function detail(overrides: Partial<AdmissionDetail> = {}): AdmissionDetail {
  return {
    id: 100,
    student_name: 'Test Child',
    state: 'new',
    allowed_actions: {},
    modern_allowed_actions: [{ code: 'log_contact', allowed: true }],
    primary_next_action: { code: 'log_contact', label: 'Log contact' },
    ...overrides,
  } as AdmissionDetail;
}

function renderAr(ui: React.ReactElement) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

function renderEn(ui: React.ReactElement) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

afterEach(() => {
  cleanup();
  window.localStorage.removeItem(LOCALE_STORAGE_KEY);
});

describe('admission rejected/closed reason instead of next action', () => {
  it('rejected card shows rejection reason title + text; hides next action', () => {
    renderAr(
      <AdmissionCard
        item={listItem({
          application_status: 'rejected',
          rejection: { is_rejected: true, reason: 'ملف ناقص' },
          primary_next_action: { code: 'reopen', label: 'إعادة فتح' },
        })}
      />,
    );

    const block = screen.getByTestId('admission-card-primary-next');
    expect(block.getAttribute('data-reason-kind')).toBe('rejected');
    expect(block.textContent).toContain('سبب الرفض');
    expect(screen.getByTestId('admission-card-terminal-reason').textContent).toContain('ملف ناقص');
    expect(block.textContent).not.toContain('الإجراء القادم');
    expect(block.textContent).not.toContain('إعادة فتح');
  });

  it('closed card shows closure reason from last_action.note; hides next action', () => {
    renderAr(
      <AdmissionCard
        item={listItem({
          application_status: 'closed',
          last_action: {
            code: 'close',
            note: 'أُغلق الطلب التجريبي بعد التحقق من مسار الإغلاق.',
          },
          primary_next_action: { code: 'reopen', label: 'إعادة فتح' },
        })}
      />,
    );

    const block = screen.getByTestId('admission-card-primary-next');
    expect(block.getAttribute('data-reason-kind')).toBe('closed');
    expect(block.textContent).toContain('سبب الإغلاق');
    expect(screen.getByTestId('admission-card-terminal-reason').textContent).toContain(
      'أُغلق الطلب التجريبي بعد التحقق من مسار الإغلاق.',
    );
    expect(block.textContent).not.toContain('الإجراء القادم');
  });

  it('closed without reason shows fallback copy', () => {
    renderAr(
      <AdmissionCard
        item={listItem({
          application_status: 'closed',
          lost_reason: null,
          last_action: null,
          primary_next_action: { code: 'reopen' },
        })}
      />,
    );
    expect(screen.getByTestId('admission-card-terminal-reason').textContent).toContain(
      'لم يتم تسجيل سبب الإغلاق',
    );
  });

  it('follow_up card still shows next action', () => {
    renderAr(
      <AdmissionCard
        item={listItem({
          application_status: 'follow_up',
          primary_next_action: { code: 'log_contact', label: 'تسجيل تواصل' },
        })}
      />,
    );
    const block = screen.getByTestId('admission-card-primary-next');
    expect(block.getAttribute('data-reason-kind')).toBeNull();
    expect(block.textContent).toContain('الإجراء القادم');
  });

  it('detail panel for closed shows reason and no primary next-action button', () => {
    renderAr(
      <AdmissionPrimaryActionPanel
        detail={detail({
          application_status: 'closed',
          lost_reason: 'انسحاب الأسرة',
          primary_next_action: { code: 'reopen', allowed: true },
          modern_allowed_actions: [{ code: 'reopen', allowed: true }],
        })}
        admissionId={100}
        onUpdated={vi.fn()}
      />,
    );

    expect(screen.getByTestId('admission-terminal-reason').textContent).toContain('انسحاب الأسرة');
    expect(screen.queryByTestId('admission-primary-action-button')).toBeNull();
    expect(screen.getByTestId('admission-primary-action-panel').getAttribute('data-reason-kind')).toBe(
      'closed',
    );
  });

  it('detail panel for rejected shows rejection reason', () => {
    renderAr(
      <AdmissionPrimaryActionPanel
        detail={detail({
          application_status: 'rejected',
          rejection: { is_rejected: true, reason: 'تجاوز الطاقة الاستيعابية' },
          primary_next_action: { code: 'reopen', allowed: true },
        })}
        admissionId={100}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.getByTestId('admission-terminal-reason').textContent).toContain(
      'تجاوز الطاقة الاستيعابية',
    );
    expect(screen.queryByTestId('admission-primary-action-button')).toBeNull();
  });

  it('LTR English titles render for rejected/closed with dir=auto', () => {
    renderEn(
      <AdmissionCard
        item={listItem({
          application_status: 'rejected',
          rejection: { is_rejected: true, reason: 'Incomplete file' },
        })}
      />,
    );
    expect(screen.getByTestId('admission-card-primary-next').textContent).toContain(
      'Rejection reason',
    );
    cleanup();

    renderEn(
      <AdmissionCard
        item={listItem({
          application_status: 'closed',
          lost_reason: 'Family moved',
        })}
      />,
    );
    expect(screen.getByTestId('admission-card-primary-next').textContent).toContain('Closure reason');
    expect(screen.getByTestId('admission-card-terminal-reason').getAttribute('dir')).toBe('auto');
  });
});
