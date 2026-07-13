// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { ReferenceJathathaDetail } from '@/types/jathatha';

vi.mock('../teaching-planning.css', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/components/ui/toast', () => ({ useToast: () => toast }));

const submitReferenceJathathaForReview = vi.fn();
const approveReferenceJathatha = vi.fn();
vi.mock('../api/reference-jathathas-api', () => ({
  submitReferenceJathathaForReview: (...args: unknown[]) => submitReferenceJathathaForReview(...args),
  approveReferenceJathatha: (...args: unknown[]) => approveReferenceJathatha(...args),
  archiveReferenceJathatha: vi.fn(),
  deleteReferenceJathatha: vi.fn(),
  duplicateReferenceJathathaVersion: vi.fn(),
  resetReferenceJathathaToDraft: vi.fn(),
}));
vi.mock('./reference-jathatha-dialogs', () => ({ ReferenceJathathaEditorDialog: () => null }));
vi.mock('./teaching-reference-dialogs', () => ({ TeachingPlanningResetDialog: () => null }));

import { ReferenceJathathaDetailView } from './reference-jathatha-detail-view';

function item(overrides: Partial<ReferenceJathathaDetail> = {}): ReferenceJathathaDetail {
  return {
    id: 12, name: 'Lesson fractions', school: { id: 1, name: 'School' },
    reference: { id: 2, name: 'Mathematics reference' },
    sequence: { id: 3, name: 'Fractions sequence' },
    session_template: { id: 4, name: 'Discovery session' },
    session_type: 'lesson', level: { id: 5, name: 'Grade 6' }, subject: { id: 6, name: 'Mathematics' },
    teaching_language: { id: 7, name: 'English', code: 'en' }, track: null,
    default_detail_level: 'standard', activity_count: 1, phase_count: 1, planned_duration_minutes: 30,
    state: 'draft', version_label: 'v2', approved_at: '2026-01-10', approved_by: { id: 99, name: 'Director' },
    readiness: { ready: false, blockers: ['template_required'], warnings: ['duration_warning'] },
    blockers: ['missing_reference'], warnings: ['review_note'], attachment_ids: [], activities: [],
    version_history: [{ id: 11, name: 'Lesson fractions v1', school: null, reference: null, sequence: null, session_template: null, level: null, subject: null, teaching_language: null, track: null, default_detail_level: 'standard', activity_count: 0, phase_count: 0, planned_duration_minutes: null, state: 'approved', version_label: 'v1', approved_at: null }],
    allowed_actions: { view: true, edit: true, submit_for_review: true, approve: true },
    ...overrides,
  };
}

function renderDetail(value = item(), onReload = vi.fn()) {
  render(<LocaleProvider><ReferenceJathathaDetailView item={value} onReload={onReload} /></LocaleProvider>);
  return onReload;
}

describe('ReferenceJathathaDetailView', () => {
  beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders reference context, readiness blockers/warnings, read-only activities and history metadata', () => {
    renderDetail();
    for (const text of ['Lesson fractions', 'Mathematics reference', 'Fractions sequence', 'Discovery session', 'missing_reference', 'review_note', 'v1']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/Approved by: Director/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add activity' })).toBeNull();
  });

  it('shows Edit, Submit and Approve only for allowed actions', () => {
    renderDetail();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
  });

  it('hides Edit for immutable approved and archived records', () => {
    const { rerender } = render(<LocaleProvider><ReferenceJathathaDetailView item={item({ state: 'approved', allowed_actions: { view: true, edit: false } })} onReload={vi.fn()} /></LocaleProvider>);
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    rerender(<LocaleProvider><ReferenceJathathaDetailView item={item({ state: 'archived', allowed_actions: { view: true } })} onReload={vi.fn()} /></LocaleProvider>);
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('submits then reloads only after API success without optimistic badge mutation', async () => {
    const user = userEvent.setup();
    const onReload = renderDetail();
    submitReferenceJathathaForReview.mockResolvedValue({ success: true, data: item({ state: 'under_review' }), meta: {} });
    expect(screen.getByText('Draft')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Submit for review' }));
    expect(submitReferenceJathathaForReview).toHaveBeenCalledWith(12);
    expect(screen.getByText('Draft')).toBeTruthy();
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
  });

  it('approves successfully and reloads', async () => {
    const user = userEvent.setup();
    const onReload = renderDetail();
    approveReferenceJathatha.mockResolvedValue({ success: true, data: item({ state: 'approved' }), meta: {} });
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
  });

  it('hides absent actions and reports API errors without reloading', async () => {
    const user = userEvent.setup();
    const onReload = renderDetail(item({ allowed_actions: { view: true, submit_for_review: true } }));
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
    submitReferenceJathathaForReview.mockResolvedValue({ success: false, error: { message: 'Invalid state' }, meta: {} });
    await user.click(screen.getByRole('button', { name: 'Submit for review' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Invalid state'));
    expect(onReload).not.toHaveBeenCalled();
  });
});
