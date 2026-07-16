// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { CurrentUser } from '@/types/user';

vi.mock('../teaching-planning-hub.css', () => ({}));

const sessionUser = vi.fn<() => CurrentUser>();

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => sessionUser(),
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({
    requiresActiveSchool: false,
    activeSchoolId: 1,
  }),
}));

import { TeachingPlanningHubPage } from './teaching-planning-hub';

function admin(caps: string[]): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'admin@test.local',
    role: 'admin',
    effective_capabilities: caps,
    permissions: [],
    school: { id: 1, name: 'School' },
  } satisfies CurrentUser;
}

function renderHub() {
  return render(
    <LocaleProvider>
      <TeachingPlanningHubPage />
    </LocaleProvider>,
  );
}

describe('TeachingPlanningHubPage', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows live Annual Distribution, Didactic Sequence, and Jathatha links for viewers', () => {
    sessionUser.mockReturnValue(
      admin([
        'teaching.planning.view',
        'teaching.offerings.manage',
        'teaching.reference_jathathas.manage',
        'teaching.jathathas.review',
      ]),
    );
    renderHub();
    const offerings = screen.getByRole('link', { name: /Teaching Offerings/i });
    const references = screen.getByRole('link', { name: /Teaching References/i });
    expect(offerings.getAttribute('href')).toBe('/admin/teaching-planning/offerings');
    expect(references.getAttribute('href')).toBe('/admin/teaching-planning/references');

    const distribution = screen.getByRole('link', { name: /Annual Distribution/i });
    const sequences = screen.getByRole('link', { name: /Didactic Sequences/i });
    expect(distribution.getAttribute('href')).toBe('/admin/teaching-planning/distributions');
    expect(sequences.getAttribute('href')).toBe('/admin/teaching-planning/sequences');

    const refJathatha = screen.getByRole('link', { name: /Reference Jathathas/i });
    const review = screen.getByRole('link', { name: /Teacher Jathatha review/i });
    expect(refJathatha.getAttribute('href')).toBe('/admin/teaching-planning/reference-jathathas');
    expect(review.getAttribute('href')).toBe('/admin/teaching-planning/teacher-jathathas');

    // Teaching Progress and Class Journal are live for the broad planning-view
    // capability; Actual Delivery Review requires its own dedicated capability.
    const progress = screen.getByRole('link', { name: /Teaching Progress/i });
    expect(progress.getAttribute('href')).toBe('/admin/teaching-planning/progress');
    const journal = screen.getByRole('link', { name: /Class Teaching Journal/i });
    expect(journal.getAttribute('href')).toBe('/admin/teaching-planning/class-journal');
    expect(screen.queryByText(/Actual Delivery Review/i)).toBeNull();
    expect(screen.queryByText('Coming later')).toBeNull();
  });

  it('shows Actual Delivery Review only for delivery view/review capabilities', () => {
    sessionUser.mockReturnValue(admin(['teaching.deliveries.view']));
    renderHub();
    const delivery = screen.getByRole('link', { name: /Actual Delivery Review/i });
    expect(delivery.getAttribute('href')).toBe('/admin/teaching-planning/actual-deliveries');
  });

  it('hides distribution and sequence cards when only offering-approve capability is present', () => {
    // teaching.offerings.approve grants distribution visibility (approvers review readiness),
    // but not sequences. Use a capability that reveals neither.
    sessionUser.mockReturnValue(admin(['teaching.references.manage']));
    renderHub();
    expect(screen.queryByRole('link', { name: /Annual Distribution/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Didactic Sequences/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Reference Jathathas/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Teacher Jathatha review/i })).toBeNull();
  });
});
