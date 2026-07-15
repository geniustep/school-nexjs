// @vitest-environment happy-dom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import { AdmissionCard } from './admission-card';
import { AdmissionRequestedServicesChips } from './admission-requested-services-chips';
import type { AdmissionListItem } from '@/types/admission';

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

vi.mock('./admission-list-actions-menu', () => ({
  AdmissionListActionsMenu: () => (
    <button type="button" aria-label="إجراءات الطلب">
      ⋯
    </button>
  ),
}));

function makeItem(overrides: Partial<AdmissionListItem> = {}): AdmissionListItem {
  return {
    id: 5857,
    student_name: 'تلميذ تجريبي طويل الاسم جدًا للاختبار',
    guardian_name: 'ولي أمر نموذجي',
    guardian_phone: '0600000099',
    source: null,
    requested_level: { id: 1, name: 'الأولى ابتدائي' },
    state: 'in_progress',
    application_status: 'in_progress',
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    assigned_user: null,
    priority: null,
    primary_next_action: 'log_contact',
    last_action: {
      result: 'reached',
      actor_name: 'Administrator',
      occurred_at: '2026-07-14T22:18:00Z',
    },
    requested_services: [
      { id: 1310, code: 'TRANSPORT', name: 'النقل المدرسي', active: true },
      { id: 1311, code: 'CANTEEN', name: 'المطعم', active: true },
      { id: 4083, code: 'GARDERIE', name: 'الحراسة', active: true },
    ],
    ...overrides,
  };
}

function renderCard(item: AdmissionListItem, props: Partial<Parameters<typeof AdmissionCard>[0]> = {}) {
  return render(
    <LocaleProvider>
      <AdmissionCard
        item={item}
        showStateBadge={false}
        selectable
        selected={false}
        selectionMode={false}
        onToggleSelect={() => undefined}
        {...props}
      />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
});

afterEach(() => {
  cleanup();
});

describe('AdmissionCard operational Kanban UX', () => {
  it('renders name, level, compact header tools, and no status badge', () => {
    renderCard(makeItem());
    const card = screen.getByTestId('admission-card-5857');
    expect(within(card).getByRole('heading', { level: 3 }).textContent).toContain('تلميذ تجريبي');
    expect(card.querySelector('.admission-card__header')).toBeTruthy();
    expect(card.querySelector('.admission-card__toolbar')).toBeNull();
    expect(within(card).getByRole('checkbox')).toBeTruthy();
    expect(within(card).getByLabelText('إجراءات الطلب')).toBeTruthy();
    expect(card.textContent).toContain('الأولى ابتدائي');
    expect(card.querySelector('.admission-status-badges')).toBeNull();
    expect(within(card).getByTestId('admission-card-status-sr')).toBeTruthy();
  });

  it('hides technical raw labels in last activity and next action', () => {
    renderCard(makeItem());
    const card = screen.getByTestId('admission-card-5857');
    const text = card.textContent ?? '';
    expect(text).not.toMatch(/\breached\b/);
    expect(text).not.toMatch(/\blog_contact\b/);
    expect(text).not.toMatch(/\bAdministrator\b/);
    expect(text).toContain('تم التواصل');
    expect(text).toContain('المسؤول الإداري');
    expect(text).toContain('تسجيل تواصل');
    expect(within(card).getByTestId('admission-card-last-action').textContent).toContain(
      'آخر نشاط',
    );
    const when = card.querySelector('.admission-card__activity-when');
    expect(when).toBeTruthy();
    expect(when?.getAttribute('dir')).toBe('ltr');
  });

  it('renders compact guardian with LTR phone', () => {
    renderCard(makeItem());
    const guardian = screen.getByTestId('admission-card-guardian');
    expect(guardian.textContent).toContain('ولي أمر نموذجي');
    expect(guardian.textContent).toContain('0600000099');
    expect(guardian.querySelector('.admission-card__details')).toBeNull();
    const phone = guardian.querySelector('.phone-text') as HTMLElement | null;
    expect(phone).toBeTruthy();
    expect(phone?.getAttribute('dir')).toBe('ltr');
  });

  it('shows up to three short services without +N', () => {
    renderCard(makeItem());
    const chips = screen.getByTestId('admission-requested-services-chips');
    expect(chips.textContent).toContain('النقل المدرسي');
    expect(chips.textContent).toContain('المطعم');
    expect(chips.textContent).toContain('الحراسة');
    expect(chips.textContent).not.toMatch(/\+\d/);
  });

  it('shows +N with accessible names for hidden services', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <AdmissionRequestedServicesChips
          services={[
            { id: 1, code: 'a', name: 'النقل', active: true },
            { id: 2, code: 'b', name: 'المطعم', active: true },
            { id: 3, code: 'c', name: 'الحراسة', active: true },
            { id: 4, code: 'd', name: 'الأنشطة', active: true },
          ]}
          maxVisible={2}
          compact
        />
      </LocaleProvider>,
    );
    const more = screen.getByRole('button', { name: /خدمات إضافية/ });
    expect(more.textContent).toContain('+2');
    await user.click(more);
    expect(screen.getByTestId('admission-requested-services-more-popover').textContent).toContain(
      'الحراسة',
    );
    expect(screen.getByTestId('admission-requested-services-more-popover').textContent).toContain(
      'الأنشطة',
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('admission-requested-services-more-popover')).toBeNull();
    expect(document.activeElement).toBe(more);
  });

  it('keeps badge when showStateBadge is true (table/mobile)', () => {
    renderCard(makeItem(), { showStateBadge: true });
    const card = screen.getByTestId('admission-card-5857');
    expect(card.querySelector('.admission-status-badges, .admission-card__status-row')).toBeTruthy();
  });
});
