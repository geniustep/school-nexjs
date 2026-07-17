// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchTeacherSessionOccurrences = vi.fn();

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));
vi.mock('@/features/teacher/jathatha/api/teacher-jathatha-api', () => ({
  fetchTeacherSessionOccurrences: (...args: unknown[]) => fetchTeacherSessionOccurrences(...args),
}));
vi.mock('@/components/states/resource', () => ({
  ResourceView: ({ state, children, empty }: any) => state.initialLoading ? <span>loading</span> : state.data?.length ? children(state.data) : empty,
}));
vi.mock('@/features/teacher/ui/teacher-primitives', () => ({
  TeacherSection: ({ children }: any) => <section>{children}</section>,
  TeacherEmptyState: ({ title }: any) => <p>{title}</p>,
  TeacherContentCard: ({ title, badge, meta, footer, href }: any) => <article><a href={href}>{title}</a>{badge}{meta}{footer}</article>,
  TeacherWorkspaceCard: ({ title, children }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));
vi.mock('@/components/badges/workflow-badge', () => ({
  WorkflowBadge: ({ state }: any) => state ? <span>workflow:{state}</span> : null,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

import { TeacherTodaySessions } from './teacher-today-sessions';

const occurrence = (overrides: Record<string, unknown> = {}) => ({
  id: 12, date: '2026-07-13', start_time: '09:00', end_time: '10:00',
  state: 'planned', class: { id: 1, name: '6A' }, subject: { id: 2, name: 'Maths' },
  teacher: null, room: 'A1', jathatha_state: 'draft', jathatha_review_state: 'not_reviewed',
  allowed_actions: { create_jathatha: true }, ...overrides,
});

describe('TeacherTodaySessions', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('shows loading, then occurrence rows, labels and the prepare CTA', async () => {
    fetchTeacherSessionOccurrences.mockResolvedValue({ success: true, data: [occurrence({ is_current: true, is_next: true, teachable: false })] });
    render(<TeacherTodaySessions />);
    expect(screen.getByText('loading')).toBeTruthy();
    await screen.findByText('6A · Maths');
    expect(screen.getByText('teacher.jathatha.current')).toBeTruthy();
    expect(screen.getByText('teacher.jathatha.next')).toBeTruthy();
    expect(screen.getByText('teacher.jathatha.notTeachable')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'teacher.jathatha.prepare' }).getAttribute('href')).toBe('/teacher/sessions/12?tab=jathatha');
    expect(fetchTeacherSessionOccurrences).toHaveBeenCalledWith({ date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
  });

  it('renders an empty today state without inventing a mutation', async () => {
    fetchTeacherSessionOccurrences.mockResolvedValue({ success: true, data: [] });
    render(<TeacherTodaySessions />);
    expect(await screen.findByText('teacher.jathatha.emptyToday')).toBeTruthy();
  });

  it('keeps terminal occurrence states visible and resolves backend-authorized CTAs only', async () => {
    fetchTeacherSessionOccurrences.mockResolvedValue({
      success: true,
      data: [
        occurrence({ id: 1, state: 'cancelled', allowed_actions: { view_jathatha: true }, jathatha_state: 'draft' }),
        occurrence({ id: 2, state: 'not_held', allowed_actions: { view_jathatha: true }, jathatha_state: 'draft' }),
        occurrence({ id: 3, state: 'superseded', allowed_actions: { create_correction: true }, current_jathatha_id: 33, jathatha_review_state: 'correction_requested' }),
        occurrence({ id: 4, allowed_actions: undefined }),
      ],
    });
    render(<TeacherTodaySessions />);
    await screen.findByText('workflow:cancelled');
    expect(screen.getByText('workflow:not_held')).toBeTruthy();
    expect(screen.getByText('workflow:superseded')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'teacher.jathatha.continue' })[0].getAttribute('href')).toBe('/teacher/sessions/1');
    expect(screen.getByRole('link', { name: 'teacher.jathatha.createCorrection' }).getAttribute('href')).toBe('/teacher/jathathas/33?action=correction');
    expect(screen.queryAllByRole('link', { name: /teacher\.jathatha\.(prepare|continue|createCorrection)/ })).toHaveLength(3);
  });

  it('retains loaded rows while a refresh is in flight instead of showing a false empty state', async () => {
    fetchTeacherSessionOccurrences.mockResolvedValue({ success: true, data: [occurrence()] });
    render(<TeacherTodaySessions />);
    await screen.findByText('6A · Maths');
    const source = readFileSync(resolve(process.cwd(), 'src/features/teacher/jathatha/components/teacher-today-sessions.tsx'), 'utf8');
    expect(source).toContain('initialLoading: loading && data === null');
    expect(source).toContain('fetching: loading && data !== null');
  });
});
