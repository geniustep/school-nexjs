// @vitest-environment happy-dom

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    id: 1,
    role: 'admin',
    permissions: ['view_channels', 'send_messages'],
  }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

import { MyPendingMessagesPanel } from './my-pending-messages-panel';

describe('MyPendingMessagesPanel request stability', () => {
  beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('loads pending-messages once on mount (no render-driven refetch loop)', async () => {
    render(<MyPendingMessagesPanel channelId={10} />);

    await waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(getMock).toHaveBeenCalledWith('/admin/channels/10/pending-messages', {
      page: 1,
      limit: 50,
    });

    // Allow re-renders from setState to settle; a dependency loop would keep firing.
    await new Promise((r) => setTimeout(r, 80));
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('refetches only when reloadToken changes', async () => {
    const { rerender } = render(<MyPendingMessagesPanel channelId={10} reloadToken={0} />);
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(1));

    rerender(<MyPendingMessagesPanel channelId={10} reloadToken={0} />);
    await new Promise((r) => setTimeout(r, 40));
    expect(getMock).toHaveBeenCalledTimes(1);

    rerender(<MyPendingMessagesPanel channelId={10} reloadToken={1} />);
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2));
  });
});
