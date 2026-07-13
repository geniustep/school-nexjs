// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchTeacherJathatha = vi.fn();
const updateTeacherJathatha = vi.fn();
const markTeacherJathathaReady = vi.fn();
const resetTeacherJathathaToDraft = vi.fn();
const confirmTeacherJathatha = vi.fn();
const createTeacherJathathaCorrection = vi.fn();
const voidTeacherJathatha = vi.fn();
const router = { push: vi.fn() };
const toast = { success: vi.fn(), error: vi.fn() };
let action: string | null = null;
vi.mock('@/features/i18n/locale-context', () => ({ useT: () => (key: string) => key }));
vi.mock('next/navigation', () => ({
  useRouter: () => router, useSearchParams: () => new URLSearchParams(action ? `action=${action}` : ''),
}));
vi.mock('@/components/ui/toast', () => ({ useToast: () => toast }));
vi.mock('@/features/teacher/jathatha/api/teacher-jathatha-api', () => ({
  fetchTeacherJathatha: (...args: unknown[]) => fetchTeacherJathatha(...args),
  updateTeacherJathatha: (...args: unknown[]) => updateTeacherJathatha(...args),
  markTeacherJathathaReady: (...args: unknown[]) => markTeacherJathathaReady(...args),
  resetTeacherJathathaToDraft: (...args: unknown[]) => resetTeacherJathathaToDraft(...args),
  confirmTeacherJathatha: (...args: unknown[]) => confirmTeacherJathatha(...args),
  createTeacherJathathaCorrection: (...args: unknown[]) => createTeacherJathathaCorrection(...args),
  voidTeacherJathatha: (...args: unknown[]) => voidTeacherJathatha(...args),
}));
vi.mock('@/components/states/states', () => ({
  LoadingState: () => <p>loading</p>, ApiErrorView: ({ error }: any) => <p>error:{error.message}</p>,
}));
vi.mock('@/components/badges/workflow-badge', () => ({ WorkflowBadge: ({ state }: any) => <span>workflow:{state}</span> }));
vi.mock('@/features/teacher/ui/teacher-primitives', () => ({
  TeacherPageHeader: ({ title, subtitle }: any) => <header><h1>{title}</h1><p>{subtitle}</p></header>,
  TeacherWorkspaceCard: ({ title, children }: any) => <section><h2>{title}</h2>{children}</section>,
}));
vi.mock('@/features/teacher/jathatha/components/jathatha-activities-editor', () => ({
  JathathaActivitiesEditor: ({ readOnly }: any) => <div>activities-editor:{String(readOnly)}</div>,
}));
vi.mock('@/components/ui/confirmation-dialog', () => ({
  ConfirmationDialog: ({ open, title, body, onConfirm }: any) => open ? <div><h2>{title}</h2>{body}<button onClick={onConfirm}>dialog-confirm</button></div> : null,
}));

import { TeacherJathathaEditor } from './teacher-jathatha-editor';

const detail = (overrides: Record<string, unknown> = {}) => ({
  id: 41, name: 'Lesson 1', session_occurrence: null, teacher: null,
  class: { id: 1, name: '6A' }, subject: { id: 2, name: 'Maths' }, offering: null, distribution: null,
  distribution_line: null, sequence: null, session_template: null, reference_jathatha: null,
  state: 'draft', review_state: 'not_reviewed', revision_number: 1, detail_level: 'standard',
  planned_duration_minutes: 60, session_objective: 'Understand fractions', materials: '', class_adaptation: '',
  quick_assessment: '', fallback_plan: '', teacher_notes: '', activities: [], attachment_ids: [],
  blockers: [], warnings: [], revisions: [], allowed_actions: { edit: true, mark_ready: true, confirm: true, create_correction: true, void: true },
  readiness: { ready: true, blockers: [], warnings: [] }, ...overrides,
});
const success = (data: any) => ({ success: true, data });

describe('TeacherJathathaEditor', () => {
  beforeEach(() => {
    fetchTeacherJathatha.mockResolvedValue(success(detail()));
    createTeacherJathathaCorrection.mockResolvedValue(success({ id: 99 }));
    voidTeacherJathatha.mockResolvedValue(success(detail({ state: 'voided' })));
    confirmTeacherJathatha.mockResolvedValue(success(detail({ state: 'confirmed' })));
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); action = null; });

  it('loads context, shows editable draft fields and activities', async () => {
    render(<TeacherJathathaEditor jathathaId="41" />);
    expect(screen.getByText('loading')).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Lesson 1' })).toBeTruthy();
    expect((screen.getByDisplayValue('Understand fractions') as HTMLTextAreaElement).disabled).toBe(false);
    expect(screen.getByText('activities-editor:false')).toBeTruthy();
  });

  it('shows correction and reviewed workflow signals', async () => {
    fetchTeacherJathatha.mockResolvedValue(success(detail({ review_state: 'correction_requested', correction_reason: 'Add examples' })));
    render(<TeacherJathathaEditor jathathaId="41" />);
    expect(await screen.findByText('Add examples')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'teacher.jathatha.createCorrection' }).length).toBeGreaterThan(0);
    cleanup();
    fetchTeacherJathatha.mockResolvedValue(success(detail({ review_state: 'reviewed' })));
    render(<TeacherJathathaEditor jathathaId="41" />);
    expect((await screen.findAllByText('workflow:reviewed')).length).toBeGreaterThan(0);
  });

  it('keeps confirmed content immutable even if an edit permission is returned', async () => {
    fetchTeacherJathatha.mockResolvedValue(success(detail({ state: 'confirmed', allowed_actions: { edit: false } })));
    render(<TeacherJathathaEditor jathathaId="41" />);
    expect((await screen.findByDisplayValue('Understand fractions') as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'common.save' })).toBeNull();
  });

  it('marks ready only on backend success and does not optimistically change the badge after failure', async () => {
    markTeacherJathathaReady.mockResolvedValue({ success: false, error: { message: 'Not ready' } });
    render(<TeacherJathathaEditor jathathaId="41" />);
    await screen.findByText('Lesson 1');
    await userEvent.click(screen.getByRole('button', { name: 'teacher.jathatha.markReady' }));
    expect(markTeacherJathathaReady).toHaveBeenCalledWith('41');
    expect(toast.error).toHaveBeenCalledWith('Not ready');
    expect(screen.getByText('workflow:draft')).toBeTruthy();
  });

  it('explains confirmation locking, and requires a reason for correction and void', async () => {
    action = 'correction';
    render(<TeacherJathathaEditor jathathaId="41" />);
    await screen.findByText('Lesson 1');
    expect(screen.getByRole('button', { name: 'dialog-confirm' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'dialog-confirm' }));
    expect(createTeacherJathathaCorrection).not.toHaveBeenCalled();
    await userEvent.type(screen.getByPlaceholderText('teacher.jathatha.reasonRequired'), 'Clarify');
    await userEvent.click(screen.getByRole('button', { name: 'dialog-confirm' }));
    expect(createTeacherJathathaCorrection).toHaveBeenCalledWith('41', { reason: 'Clarify' });
    cleanup();
    action = null;
    render(<TeacherJathathaEditor jathathaId="41" />);
    await screen.findByText('Lesson 1');
    await userEvent.click(screen.getByRole('button', { name: 'common.confirm' }));
    expect(screen.getByText('teacher.jathatha.confirmImmutable')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'teacher.jathatha.void' }));
    await userEvent.click(screen.getByRole('button', { name: 'dialog-confirm' }));
    expect(voidTeacherJathatha).not.toHaveBeenCalled();
  });

  it('carries the adopted design marker in source', () => {
    expect(readFileSync(resolve(process.cwd(), 'src/features/teacher/jathatha/components/teacher-jathatha-editor.tsx'), 'utf8')).toContain('@design-status adopted');
  });
});
