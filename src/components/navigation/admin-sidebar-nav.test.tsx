// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from '@/components/navigation/admin-sidebar';
import {
  ADMIN_SIDEBAR_COLLAPSED_KEY,
  ADMIN_SIDEBAR_GROUPS_KEY,
} from '@/components/navigation/admin-sidebar-storage';
import type { NavSection } from '@/components/navigation/nav-config';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';

const sections: NavSection[] = [
  {
    groupId: 'ops',
    titleKey: 'nav.adminOperations',
    defaultOpen: true,
    items: [
      { labelKey: 'nav.dashboard', href: '/admin/dashboard', icon: '🏠' },
      { labelKey: 'nav.attendance', href: '/admin/attendance', icon: '🗓️' },
    ],
  },
  {
    groupId: 'finance',
    titleKey: 'nav.financeSection',
    defaultOpen: false,
    items: [{ labelKey: 'nav.finance', href: '/admin/finance', icon: '💰' }],
  },
];

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
});

describe('AdminSidebar accordion', () => {
  it('keeps only one group open and persists official storage', async () => {
    const user = userEvent.setup();

    render(
      <LocaleProvider>
        <AdminSidebar
          user={{
            id: 1,
            name: 'Admin User',
            role: 'admin',
            school: { id: 1, name: 'Ahlen School' },
          } as never}
          sections={sections}
          roleLabel="Admin"
          scopeDesc={null}
          mainDrawerOpen
          loggingOut={false}
          onLogout={() => undefined}
          onNavigate={() => undefined}
        />
      </LocaleProvider>,
    );

    expect(document.querySelector('[data-sidebar-variant="admin"]')).toBeTruthy();

    const dashboard = screen.getByRole('link', { name: /لوحة|Dashboard|dashboard/i });
    expect(dashboard.getAttribute('aria-current')).toBe('page');

    const opsToggle = screen.getByRole('button', { name: /عمليات|Operations|operations/i });
    const financeToggle = screen.getByRole('button', { name: /مال|Finance|finance/i });
    expect(opsToggle.getAttribute('aria-expanded')).toBe('true');
    expect(financeToggle.getAttribute('aria-expanded')).toBe('false');

    await user.click(financeToggle);
    expect(financeToggle.getAttribute('aria-expanded')).toBe('true');
    expect(opsToggle.getAttribute('aria-expanded')).toBe('false');

    const stored = JSON.parse(localStorage.getItem(ADMIN_SIDEBAR_GROUPS_KEY) || '{}');
    expect(stored.finance).toBe(true);
    expect(stored.ops).toBe(false);
  });

  it('keeps the rail collapsed when a group icon is clicked', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, '1');

    render(
      <LocaleProvider>
        <AdminSidebar
          user={{
            id: 1,
            name: 'Admin User',
            role: 'admin',
            school: { id: 1, name: 'Ahlen School' },
          } as never}
          sections={sections}
          roleLabel="Admin"
          scopeDesc={null}
          mainDrawerOpen
          loggingOut={false}
          onLogout={() => undefined}
          onNavigate={() => undefined}
        />
      </LocaleProvider>,
    );

    const aside = document.querySelector('[data-sidebar-variant="admin"]');
    await waitFor(() => {
      expect(aside?.classList.contains('sidebar--focus-v2-collapsed')).toBe(true);
    });

    const financeToggle = screen.getByRole('button', { name: /مال|Finance|finance/i });
    await user.click(financeToggle);

    expect(aside?.classList.contains('sidebar--focus-v2-collapsed')).toBe(true);
    expect(localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY)).toBe('1');
    expect(screen.getByRole('link', { name: /مال|Finance|finance/i })).toBeTruthy();
  });

  it('reveals all destinations of a group in collapsed rail mode', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, '1');

    render(
      <LocaleProvider>
        <AdminSidebar
          user={{
            id: 1,
            name: 'Admin User',
            role: 'admin',
            school: { id: 1, name: 'Ahlen School' },
          } as never}
          sections={sections}
          roleLabel="Admin"
          scopeDesc={null}
          mainDrawerOpen
          loggingOut={false}
          onLogout={() => undefined}
          onNavigate={() => undefined}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector('.sidebar--focus-v2-collapsed')).toBeTruthy();
    });

    // Ops is active on dashboard — attendance sibling should also be visible in rail.
    expect(screen.getByRole('link', { name: /حضور|Attendance|attendance/i })).toBeTruthy();

    const financeToggle = screen.getByRole('button', { name: /مال|Finance|finance/i });
    await user.click(financeToggle);
    expect(screen.getByRole('link', { name: /مال|Finance|finance/i })).toBeTruthy();
  });
});
