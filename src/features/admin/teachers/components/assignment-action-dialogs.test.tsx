// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssignmentActionDialogs } from './assignment-action-dialogs';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const endTeachingAssignment = vi.fn();
const suspendTeachingAssignment = vi.fn();

vi.mock('@/features/admin/teachers/api/teacher-domain-api', () => ({
  activateTeachingAssignment: vi.fn(),
  cancelTeachingAssignment: vi.fn(),
  endTeachingAssignment: (...args: unknown[]) => endTeachingAssignment(...args),
  resumeTeachingAssignment: vi.fn(),
  suspendTeachingAssignment: (...args: unknown[]) => suspendTeachingAssignment(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('AssignmentActionDialogs', () => {
  it('requires end reason', async () => {
    render(
      <AssignmentActionDialogs
        assignment={{ id: 10, state: 'active' }}
        action="end"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.teacherDomain.assignmentActions.end' }),
    );
    expect(endTeachingAssignment).not.toHaveBeenCalled();
    expect(
      screen.getByText('admin.teacherDomain.errors.assignmentTerminationReasonRequired'),
    ).toBeTruthy();
  });

  it('suspends via backend action endpoint without local transitions', async () => {
    suspendTeachingAssignment.mockResolvedValue({
      success: true,
      data: { id: 10, state: 'suspended' },
      meta: {},
    });
    render(
      <AssignmentActionDialogs
        assignment={{ id: 10, state: 'active' }}
        action="suspend"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.teacherDomain.assignmentActions.suspend' }),
    );
    await waitFor(() => {
      expect(suspendTeachingAssignment).toHaveBeenCalledWith(10);
    });
  });
});
