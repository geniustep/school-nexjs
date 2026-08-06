// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const postMock = vi.fn();
const sessionState = { activeSchoolId: 1 as number };

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({
    get activeSchoolId() {
      return sessionState.activeSchoolId;
    },
    requiresActiveSchool: false,
    schools: [
      { id: 1, name: 'School A' },
      { id: 2, name: 'School B' },
    ],
    switching: false,
  }),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

import { ChannelFormDialog } from './channel-form-dialog';

function mockClassesForSchool(schoolId: number) {
  getMock.mockImplementation((_path: string, query?: { active_school_id?: number }) => {
    const id = query?.active_school_id ?? schoolId;
    if (id === 1) {
      return Promise.resolve({
        success: true,
        data: [{ id: 40, name: '6A-SchoolA' }],
        meta: {},
      });
    }
    return Promise.resolve({
      success: true,
      data: [{ id: 77, name: '5B-SchoolB' }],
      meta: {},
    });
  });
}

describe('ChannelFormDialog school-scoped class selection', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    sessionState.activeSchoolId = 1;
    mockClassesForSchool(1);
    postMock.mockResolvedValue({
      success: true,
      data: { id: 1, name: 'x' },
      meta: {},
    });
  });

  it('clears classId on school switch and refuses stale school A class_id', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const { rerender } = render(
      <ChannelFormDialog open mode="create" onClose={onClose} onSuccess={onSuccess} />,
    );

    await user.selectOptions(screen.getByLabelText('channels.lifecycle.channelType'), 'class');
    await waitFor(() => expect(screen.getByText('6A-SchoolA')).toBeTruthy());
    await user.selectOptions(screen.getByLabelText('channels.lifecycle.classLabel'), '40');
    expect((screen.getByLabelText('channels.lifecycle.classLabel') as HTMLSelectElement).value).toBe(
      '40',
    );

    sessionState.activeSchoolId = 2;
    mockClassesForSchool(2);
    rerender(<ChannelFormDialog open mode="create" onClose={onClose} onSuccess={onSuccess} />);

    await waitFor(() => expect(screen.getByText('5B-SchoolB')).toBeTruthy());
    expect((screen.getByLabelText('channels.lifecycle.classLabel') as HTMLSelectElement).value).toBe(
      '',
    );
    expect(screen.queryByText('6A-SchoolA')).toBeNull();

    await user.type(screen.getByLabelText('channels.lifecycle.name'), 'قناة');
    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.createSubmit' }));

    await waitFor(() =>
      expect(screen.getByText('channels.lifecycle.errors.classRequired')).toBeTruthy(),
    );
    expect(postMock).not.toHaveBeenCalled();
  });

  it('submits only a class_id present in the current school options', async () => {
    const user = userEvent.setup();
    render(
      <ChannelFormDialog open mode="create" onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

    await user.selectOptions(screen.getByLabelText('channels.lifecycle.channelType'), 'class');
    await waitFor(() => expect(screen.getByText('6A-SchoolA')).toBeTruthy());
    await user.type(screen.getByLabelText('channels.lifecycle.name'), 'قناة');
    await user.selectOptions(screen.getByLabelText('channels.lifecycle.classLabel'), '40');
    await user.click(screen.getByRole('button', { name: 'channels.lifecycle.createSubmit' }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const [, body] = postMock.mock.calls[0];
    expect(body).toMatchObject({ class_id: 40, channel_type: 'class' });
  });
});
