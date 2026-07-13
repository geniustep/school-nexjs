// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { TeacherJathathaDetail } from '@/types/jathatha';

vi.mock('../teaching-planning.css', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/components/ui/toast', () => ({ useToast: () => toast }));
const markTeacherJathathaReviewed = vi.fn();
const requestTeacherJathathaCorrection = vi.fn();
vi.mock('../api/teacher-jathathas-admin-api', () => ({
  markTeacherJathathaReviewed: (...args: unknown[]) => markTeacherJathathaReviewed(...args),
  requestTeacherJathathaCorrection: (...args: unknown[]) => requestTeacherJathathaCorrection(...args),
}));

import { TeacherJathathaReviewDetailView } from './teacher-jathatha-review-detail-view';

function item(overrides: Partial<TeacherJathathaDetail> = {}): TeacherJathathaDetail {
  return {
    id: 21, name: 'Fractions lesson', session_occurrence: null,
    teacher: { id: 1, name: 'Ms Teacher' }, class: { id: 2, name: 'Class 6A' },
    subject: { id: 3, name: 'Mathematics' }, offering: { id: 4, name: 'Grade 6 Maths' },
    distribution: { id: 5, name: 'Term 1' }, distribution_line: { id: 6, name: 'Fractions line' },
    sequence: { id: 7, name: 'Fractions' }, session_template: { id: 8, name: 'Discovery' },
    reference_jathatha: null, state: 'ready', review_state: 'not_reviewed', revision_number: 2,
    detail_level: 'detailed', planned_duration_minutes: 45, session_date: '2026-01-15',
    session_start_time: '09:00', session_end_time: '09:45',
    readiness: { ready: true, blockers: [], warnings: [] }, correction_requested: false,
    correction_reason: null, reviewed_at: null, reviewed_by: null,
    activities: [{ sequence_order: 1, name: 'Explore', activity_type: 'situation', phases: [] }],
    attachment_ids: [], blockers: [], warnings: [], revisions: [],
    allowed_actions: { view: true, mark_reviewed: true, request_correction: true },
    ...overrides,
  };
}
function renderDetail(value = item(), onReload = vi.fn()) {
  render(<LocaleProvider><TeacherJathathaReviewDetailView item={value} onReload={onReload} /></LocaleProvider>);
  return onReload;
}

describe('TeacherJathathaReviewDetailView', () => {
  beforeEach(() => localStorage.setItem(LOCALE_STORAGE_KEY, 'en'));
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders session, teacher, class and subject context with read-only activities', () => {
    renderDetail();
    for (const text of ['Ms Teacher', 'Class 6A', 'Mathematics']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('2026-01-15 09:00 09:45')).toBeTruthy();
    expect(screen.getByDisplayValue('Explore')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add activity' })).toBeNull();
  });

  it('Admin reviewer cannot edit Teacher Jathatha content', () => {
    renderDetail();
    expect(screen.queryByRole('button', { name: /^Edit$|^تعديل$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  });

  it('marks the Jathatha reviewed when the action is allowed', async () => {
    const user = userEvent.setup();
    const onReload = renderDetail();
    markTeacherJathathaReviewed.mockResolvedValue({ success: true, data: item(), meta: {} });
    await user.click(screen.getByRole('button', { name: 'Mark reviewed' }));
    expect(markTeacherJathathaReviewed).toHaveBeenCalledWith(21);
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
  });

  it('opens correction dialog but refuses an empty reason', async () => {
    const user = userEvent.setup();
    renderDetail();
    await user.click(screen.getByRole('button', { name: 'Request correction' }));
    const correctionButtons = screen.getAllByRole('button', { name: 'Request correction' });
    expect(correctionButtons).toHaveLength(2);
    await user.click(correctionButtons[1]);
    expect(requestTeacherJathathaCorrection).not.toHaveBeenCalled();
  });

  it('submits a correction reason then reloads', async () => {
    const user = userEvent.setup();
    const onReload = renderDetail();
    requestTeacherJathathaCorrection.mockResolvedValue({ success: true, data: item(), meta: {} });
    await user.click(screen.getByRole('button', { name: 'Request correction' }));
    await user.type(screen.getAllByRole('textbox').at(-1)!, 'Please clarify the assessment.');
    await user.click(screen.getAllByRole('button', { name: 'Request correction' })[1]);
    expect(requestTeacherJathathaCorrection).toHaveBeenCalledWith(21, { reason: 'Please clarify the assessment.' });
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
  });

  it('hides mark reviewed when its action is absent', () => {
    renderDetail(item({ allowed_actions: { view: true, request_correction: true } }));
    expect(screen.queryByRole('button', { name: 'Mark reviewed' })).toBeNull();
  });
});
