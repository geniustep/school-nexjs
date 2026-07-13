// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fetchJathathaContext = vi.fn();
const createTeacherJathatha = vi.fn();
const router = { push: vi.fn(), replace: vi.fn() };
const toast = { error: vi.fn() };
vi.mock('@/features/i18n/locale-context', () => ({ useT: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/ui/toast', () => ({ useToast: () => toast }));
vi.mock('@/components/states/states', () => ({
  LoadingState: () => <p>loading</p>,
  ApiErrorView: ({ error }: any) => <p>error:{error.message}</p>,
}));
vi.mock('@/features/teacher/jathatha/api/teacher-jathatha-api', () => ({
  fetchJathathaContext: (...args: unknown[]) => fetchJathathaContext(...args),
  createTeacherJathatha: (...args: unknown[]) => createTeacherJathatha(...args),
}));

import { JathathaContextStep } from './jathatha-context-step';

const context = (overrides: Record<string, unknown> = {}) => ({
  occurrence: { id: 7, class: { id: 1, name: '6A' }, subject: { id: 2, name: 'Maths' } },
  assignment: null, offering: null, active_distribution: null,
  candidate_distribution_lines: [
    { id: 11, name: 'Recommended sequence', item_type: 'sequence', sequence: { id: 4, name: 'S1' }, recommended: true },
    { id: 12, name: 'Standalone exercise', item_type: 'item', sequence: null },
  ],
  candidate_session_templates: [{ id: 21, name: 'Recommended template', sequence_id: 4, recommended: true }],
  approved_reference_jathatha: { id: 31, name: 'Approved reference' },
  current_teacher_jathatha: null, blockers: ['No substitute'], warnings: ['Review timing'],
  allowed_actions: { create_jathatha: true }, ...overrides,
});

describe('JathathaContextStep', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('starts with no selected line or template, then shows sequence templates without auto-selecting a recommendation', async () => {
    fetchJathathaContext.mockResolvedValue({ success: true, data: context() });
    const user = userEvent.setup();
    render(<JathathaContextStep occurrenceId="7" />);
    await screen.findByText('Recommended sequence (teacher.jathatha.recommended)');
    expect(screen.queryByText('teacher.jathatha.sessionTemplate')).toBeNull();
    expect(screen.getByText('No substitute')).toBeTruthy();
    expect(screen.getByText('Review timing')).toBeTruthy();
    expect(screen.getByText(/Approved reference/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'teacher.jathatha.create' }) as HTMLButtonElement).disabled).toBe(true);

    await user.selectOptions(screen.getByLabelText('teacher.jathatha.distributionLine'), '11');
    const template = screen.getByLabelText('teacher.jathatha.sessionTemplate') as HTMLSelectElement;
    expect(template.value).toBe('');
    expect((screen.getByRole('button', { name: 'teacher.jathatha.create' }) as HTMLButtonElement).disabled).toBe(true);
    await user.selectOptions(template, '21');
    expect((screen.getByRole('button', { name: 'teacher.jathatha.create' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('creates standalone lines without a template and sends selected ids and detail level', async () => {
    fetchJathathaContext.mockResolvedValue({ success: true, data: context() });
    createTeacherJathatha.mockResolvedValue({ success: true, data: { id: 88 } });
    const user = userEvent.setup();
    render(<JathathaContextStep occurrenceId="7" />);
    await screen.findByText('Standalone exercise');
    await user.selectOptions(screen.getByLabelText('teacher.jathatha.distributionLine'), '12');
    expect(screen.queryByText('teacher.jathatha.sessionTemplate')).toBeNull();
    await user.selectOptions(screen.getByLabelText('teacher.jathatha.detailLevel'), 'detailed');
    await user.click(screen.getByRole('button', { name: 'teacher.jathatha.create' }));
    await waitFor(() => expect(createTeacherJathatha).toHaveBeenCalledWith({
      session_occurrence_id: 7, distribution_line_id: 12, sequence_session_template_id: null,
      reference_jathatha_id: 31, detail_level: 'detailed',
    }));
    expect(router.push).toHaveBeenCalledWith('/teacher/jathathas/88');
  });

  it('prevents double submission while the create request is pending', async () => {
    fetchJathathaContext.mockResolvedValue({ success: true, data: context() });
    createTeacherJathatha.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(<JathathaContextStep occurrenceId="7" />);
    await screen.findByText('Standalone exercise');
    await user.selectOptions(screen.getByLabelText('teacher.jathatha.distributionLine'), '12');
    const create = screen.getByRole('button', { name: 'teacher.jathatha.create' });
    await user.click(create);
    await user.click(create);
    expect(createTeacherJathatha).toHaveBeenCalledTimes(1);
    expect((create as HTMLButtonElement).disabled).toBe(true);
  });

  it('opens an existing current Jathatha rather than rendering a duplicate creation flow', async () => {
    fetchJathathaContext.mockResolvedValue({ success: true, data: context({ current_teacher_jathatha: { id: 55 } }) });
    render(<JathathaContextStep occurrenceId="7" />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/teacher/jathathas/55'));
  });
});
