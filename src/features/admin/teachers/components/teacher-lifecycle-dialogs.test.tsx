// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TeacherLifecycleDialogs } from './teacher-lifecycle-dialogs';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const terminateTeacher = vi.fn();
const archiveTeacher = vi.fn();
const reactivateTeacher = vi.fn();

vi.mock('@/features/admin/teachers/api/teacher-domain-api', () => ({
  terminateTeacher: (...args: unknown[]) => terminateTeacher(...args),
  archiveTeacher: (...args: unknown[]) => archiveTeacher(...args),
  reactivateTeacher: (...args: unknown[]) => reactivateTeacher(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('TeacherLifecycleDialogs', () => {
  it('requires archive reason before calling API', async () => {
    render(
      <TeacherLifecycleDialogs
        teacher={{ id: 1, name: 'أستاذ', code: 'T1', status: 'active' }}
        action="archive"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'admin.teacherDomain.lifecycle.archive' }));
    expect(archiveTeacher).not.toHaveBeenCalled();
    expect(screen.getByText('admin.teacherDomain.errors.archiveReasonRequired')).toBeTruthy();
  });

  it('requires terminate reason and supports end date', async () => {
    terminateTeacher.mockResolvedValue({ success: true, data: { id: 1, name: 'أستاذ', code: 'T1', status: 'terminated' }, meta: {} });
    const onSuccess = vi.fn();
    render(
      <TeacherLifecycleDialogs
        teacher={{ id: 1, name: 'أستاذ', code: 'T1', status: 'active' }}
        action="terminate"
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'سبب الإنهاء' } });
    fireEvent.change(within(dialog).getByDisplayValue(''), { target: { value: '2026-07-20' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'admin.teacherDomain.lifecycle.terminate' }));
    await waitFor(() => {
      expect(terminateTeacher).toHaveBeenCalledWith(1, { reason: 'سبب الإنهاء', employment_end_date: '2026-07-20' });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('keeps legacy reactivate without a restart date', async () => {
    reactivateTeacher.mockResolvedValue({ success: true, data: { id: 1, name: 'أستاذ', code: 'T1', status: 'active' }, meta: {} });
    render(
      <TeacherLifecycleDialogs
        teacher={{ id: 1, name: 'أستاذ', code: 'T1', status: 'on_leave', allowed_actions: { reactivate: true } }}
        action="reactivate"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'admin.teacherDomain.lifecycle.reactivate' }));
    await waitFor(() => expect(reactivateTeacher).toHaveBeenCalledWith(1, undefined));
  });

  it('requires effective_from for a terminated membership restart', async () => {
    reactivateTeacher.mockResolvedValue({ success: true, data: { id: 1, name: 'أستاذ', code: 'T1', status: 'active' }, meta: {} });
    render(
      <TeacherLifecycleDialogs
        teacher={{ id: 1, name: 'أستاذ', code: 'T1', status: 'resigned', active: false, allowed_actions: { restart_membership: true } }}
        action="reactivate"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'admin.teacherDomain.lifecycle.reactivate' }));
    expect(reactivateTeacher).not.toHaveBeenCalled();
    expect(screen.getByText('errors.validationFailed')).toBeTruthy();

    const dateInput = screen.getByRole('dialog').querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'admin.teacherDomain.lifecycle.reactivate' }));
    await waitFor(() => expect(reactivateTeacher).toHaveBeenCalledWith(1, { effective_from: '2026-09-01' }));
  });
});
