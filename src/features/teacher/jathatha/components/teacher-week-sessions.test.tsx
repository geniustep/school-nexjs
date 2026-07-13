// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchTeacherSessionOccurrences = vi.fn();
vi.mock('@/features/i18n/locale-context', () => ({ useT: () => (key: string) => key }));
vi.mock('@/features/teacher/jathatha/api/teacher-jathatha-api', () => ({
  fetchTeacherSessionOccurrences: (...args: unknown[]) => fetchTeacherSessionOccurrences(...args),
}));
vi.mock('@/components/states/resource', () => ({
  ResourceView: ({ state, children, empty }: any) => state.initialLoading ? <span>loading</span> : state.data?.length ? children(state.data) : empty,
}));
vi.mock('@/features/teacher/ui/teacher-primitives', () => ({
  TeacherSection: ({ children }: any) => <section>{children}</section>,
  TeacherEmptyState: ({ title }: any) => <p>{title}</p>,
  TeacherContentCard: ({ title, meta, href }: any) => <article><a href={href}>{title}</a>{meta}</article>,
}));
vi.mock('@/components/badges/workflow-badge', () => ({
  WorkflowBadge: ({ state }: any) => state ? <span>workflow:{state}</span> : null,
}));
vi.mock('next/link', () => ({ default: ({ href, children }: any) => <a href={href}>{children}</a> }));

import { TeacherWeekSessions } from './teacher-week-sessions';

const row = {
  id: 21, date: '2026-07-14', start_time: '08:00', end_time: '09:00', state: 'planned',
  class: { id: 1, name: '5B' }, subject: { id: 2, name: 'Science' }, teacher: null,
  jathatha_state: 'ready', jathatha_review_state: 'reviewed', allowed_actions: {},
};

describe('TeacherWeekSessions', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders dated occurrences with session deep links and workflow badges', async () => {
    fetchTeacherSessionOccurrences.mockResolvedValue({ success: true, data: [row] });
    render(<TeacherWeekSessions />);
    const link = await screen.findByRole('link', { name: '2026-07-14 · 5B · Science' });
    expect(link.getAttribute('href')).toBe('/teacher/sessions/21');
    expect(screen.getByText('workflow:ready')).toBeTruthy();
    expect(screen.getByText('workflow:reviewed')).toBeTruthy();
    expect(fetchTeacherSessionOccurrences).toHaveBeenCalledWith(expect.objectContaining({ date_from: expect.any(String), date_to: expect.any(String) }));
  });

  it('renders the empty week state', async () => {
    fetchTeacherSessionOccurrences.mockResolvedValue({ success: true, data: [] });
    render(<TeacherWeekSessions />);
    expect(await screen.findByText('teacher.jathatha.emptyWeek')).toBeTruthy();
  });

  it('labels timetable occurrences explicitly as a weekly-slot preview', () => {
    const timetable = readFileSync(resolve(process.cwd(), 'src/app/teacher/timetable/page.tsx'), 'utf8');
    expect(timetable).toContain('teacher.jathatha.weeklySlotPreview');
    expect(timetable).toContain('teacher.jathatha.weeklySlotPreviewDescription');
    expect(timetable).toContain('<TeacherWeekSessions />');
  });
});
