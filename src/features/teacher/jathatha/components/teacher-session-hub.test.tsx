// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchTeacherSessionOccurrence = vi.fn();
let tab = 'overview';
vi.mock('@/features/i18n/locale-context', () => ({ useT: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(`tab=${tab}`) }));
vi.mock('@/features/teacher/jathatha/api/teacher-jathatha-api', () => ({
  fetchTeacherSessionOccurrence: (...args: unknown[]) => fetchTeacherSessionOccurrence(...args),
}));
vi.mock('@/features/teacher/jathatha/components/jathatha-context-step', () => ({
  JathathaContextStep: ({ occurrenceId }: any) => <p>context-stub:{occurrenceId}</p>,
}));
vi.mock('@/features/teacher/delivery/components/delivery-context-step', () => ({
  DeliveryContextStep: ({ occurrenceId }: any) => <p>delivery-context-stub:{occurrenceId}</p>,
}));
vi.mock('@/features/teacher/ui/teacher-primitives', () => ({
  TeacherPageHeader: ({ title, subtitle }: any) => <header><h1>{title}</h1><p>{subtitle}</p></header>,
  TeacherWorkspaceCard: ({ title, children }: any) => <section><h2>{title}</h2>{children}</section>,
  TeacherSegmentedTabs: ({ items }: any) => <nav>{items.map((item: any) => <a key={item.key} href={item.href}>{item.label}</a>)}</nav>,
}));
vi.mock('@/components/badges/workflow-badge', () => ({ WorkflowBadge: ({ state }: any) => <span>workflow:{state}</span> }));
vi.mock('@/components/states/states', () => ({
  LoadingState: () => <p>loading</p>,
  ApiErrorView: ({ error }: any) => <p>error:{error.message}</p>,
}));
vi.mock('next/link', () => ({ default: ({ href, children }: any) => <a href={href}>{children}</a> }));

import { TeacherSessionHub } from './teacher-session-hub';

const occurrence = (overrides: Record<string, unknown> = {}) => ({
  id: 9, date: '2026-07-13', start_time: '09:00', end_time: '10:00', state: 'planned',
  class: { id: 2, name: '6A' }, subject: { id: 3, name: 'Mathematics' }, teacher: { id: 4, name: 'Ada' },
  room: 'B2', offering: null, distribution: null, jathatha_state: 'draft', jathatha_review_state: 'reviewed',
  current_jathatha_id: null, ...overrides,
});

describe('TeacherSessionHub', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); tab = 'overview'; });

  it('shows a loading state then the class and subject overview', async () => {
    fetchTeacherSessionOccurrence.mockResolvedValue({ success: true, data: occurrence() });
    render(<TeacherSessionHub occurrenceId="9" />);
    expect(screen.getByText('loading')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Mathematics' })).toBeTruthy();
    expect(screen.getAllByText(/6A/).length).toBeGreaterThan(0);
  });

  it('opens the existing Jathatha from the Jathatha tab', async () => {
    tab = 'jathatha';
    fetchTeacherSessionOccurrence.mockResolvedValue({ success: true, data: occurrence({ current_jathatha_id: 44 }) });
    render(<TeacherSessionHub occurrenceId="9" />);
    expect((await screen.findByRole('link', { name: 'teacher.jathatha.open' })).getAttribute('href')).toBe('/teacher/jathathas/44');
  });

  it('renders context resolution when no Jathatha exists', async () => {
    tab = 'jathatha';
    fetchTeacherSessionOccurrence.mockResolvedValue({ success: true, data: occurrence() });
    render(<TeacherSessionHub occurrenceId="9" />);
    expect(await screen.findByText('context-stub:9')).toBeTruthy();
  });

  it('offers attendance and homework deep links from their tabs', async () => {
    tab = 'attendance';
    fetchTeacherSessionOccurrence.mockResolvedValue({ success: true, data: occurrence() });
    const { rerender } = render(<TeacherSessionHub occurrenceId="9" />);
    expect((await screen.findByRole('link', { name: 'academic.takeAttendance' })).getAttribute('href')).toBe('/teacher/attendance?class=2');
    tab = 'homeworks';
    rerender(<TeacherSessionHub occurrenceId="9" />);
    expect((await screen.findAllByRole('link', { name: 'nav.homeworks' }).then((links) => links.at(-1)!)).getAttribute('href')).toBe('/teacher/classes/2/homeworks');
  });

  it('renders API errors and keeps delivery tabs gated by allowed_actions', async () => {
    fetchTeacherSessionOccurrence.mockResolvedValue({ success: false, error: { message: 'Denied' } });
    render(<TeacherSessionHub occurrenceId="9" />);
    expect(await screen.findByText('error:Denied')).toBeTruthy();
    const source = readFileSync(resolve(process.cwd(), 'src/features/teacher/jathatha/components/teacher-session-hub.tsx'), 'utf8');
    // Delivery is a separate tab module; Jathatha remains its own entity.
    expect(source).toContain('DeliveryContextStep');
    expect(source).toContain('view_delivery');
    expect(source).toContain('create_delivery');
    expect(source).not.toMatch(/homework.*create|attendance.*takeAttendance.*inline/i);
  });

  it('shows delivery / journal / progress tabs only when Backend allows them', async () => {
    fetchTeacherSessionOccurrence.mockResolvedValue({
      success: true,
      data: occurrence({
        allowed_actions: { view_delivery: true, create_delivery: true, view_journal: true, view_progress: true },
        delivery_state: 'draft',
        current_delivery_id: 12,
        current_journal_entry_id: 33,
        progress_summary: '40%',
      }),
    });
    render(<TeacherSessionHub occurrenceId="9" />);
    expect(await screen.findByRole('link', { name: 'teacher.delivery.tab' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'teacher.classJournal.tab' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'teacher.teachingProgress.tab' })).toBeTruthy();
  });

  it('hides delivery tabs when allowed_actions omit them', async () => {
    fetchTeacherSessionOccurrence.mockResolvedValue({ success: true, data: occurrence({ allowed_actions: {} }) });
    render(<TeacherSessionHub occurrenceId="9" />);
    await screen.findByRole('heading', { name: 'Mathematics' });
    expect(screen.queryByRole('link', { name: 'teacher.delivery.tab' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'teacher.classJournal.tab' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'teacher.teachingProgress.tab' })).toBeNull();
  });
});
