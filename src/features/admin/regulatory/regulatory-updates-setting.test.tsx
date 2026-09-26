/** @vitest-environment happy-dom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegulatoryUpdatesSetting } from './regulatory-updates-setting';

const mocks = vi.hoisted(() => ({
  fetchSettings: vi.fn(),
  updateSettings: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('./api', () => ({
  fetchRegulatorySettings: mocks.fetchSettings,
  updateRegulatorySettings: mocks.updateSettings,
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useLocale: () => ({ locale: 'ar' as const }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    show: vi.fn(),
    success: mocks.toastSuccess,
    warning: vi.fn(),
    error: mocks.toastError,
  }),
}));

const success = (updates_enabled: boolean) => ({
  success: true as const,
  data: { updates_enabled, ack_configured: false },
  meta: {},
});

const failure = (message: string) => ({
  success: false as const,
  error: { code: 'server_error', message },
  meta: {},
});

describe('RegulatoryUpdatesSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps loading neutral until the backend confirms the state', async () => {
    let resolve!: (value: ReturnType<typeof success>) => void;
    mocks.fetchSettings.mockReturnValue(new Promise((done) => { resolve = done; }));

    render(<RegulatoryUpdatesSetting canManage />);

    expect(screen.getByText('جارٍ تحميل حالة الاستقبال…')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();

    await act(async () => {
      resolve(success(true));
    });

    const toggle = await screen.findByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('shows confirmed disabled state and keeps it read-only without create capability', async () => {
    mocks.fetchSettings.mockResolvedValue(success(false));

    render(<RegulatoryUpdatesSetting canManage={false} />);

    const toggle = await screen.findByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('متوقف')).toBeTruthy();
    expect(screen.getByText('يمكنك عرض الحالة الحالية، لكن لا تملك صلاحية تغييرها.')).toBeTruthy();
  });

  it('sends one boolean mutation and uses the server-confirmed enabled state', async () => {
    mocks.fetchSettings.mockResolvedValue(success(false));
    mocks.updateSettings.mockResolvedValue(success(true));

    render(<RegulatoryUpdatesSetting canManage />);

    const toggle = await screen.findByRole('switch');
    fireEvent.click(toggle);

    expect(mocks.updateSettings).toHaveBeenCalledTimes(1);
    expect(mocks.updateSettings).toHaveBeenCalledWith(true);
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('تم تحديث إعداد استقبال التحديثات التنظيمية.');
  });

  it('prevents duplicate submission while a mutation is pending', async () => {
    const user = userEvent.setup();
    let resolve!: (value: ReturnType<typeof success>) => void;
    mocks.fetchSettings.mockResolvedValue(success(false));
    mocks.updateSettings.mockReturnValue(new Promise((done) => { resolve = done; }));

    render(<RegulatoryUpdatesSetting canManage />);

    const toggle = await screen.findByRole('switch');
    await user.click(toggle);
    expect(mocks.updateSettings).toHaveBeenCalledTimes(1);
    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(true));

    await user.click(toggle);
    expect(mocks.updateSettings).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve(success(true));
    });
    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(false));
  });

  it('retains the previous confirmed state when mutation fails', async () => {
    mocks.fetchSettings.mockResolvedValue(success(true));
    mocks.updateSettings.mockResolvedValue(failure('تعذر الحفظ'));

    render(<RegulatoryUpdatesSetting canManage />);

    const toggle = await screen.findByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);

    await waitFor(() => expect((toggle as HTMLButtonElement).disabled).toBe(false));
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(mocks.toastError).toHaveBeenCalledWith('تعذر الحفظ');
  });

  it('isolates a settings load failure from the rest of the page and supports retry', async () => {
    mocks.fetchSettings
      .mockResolvedValueOnce(failure('failed'))
      .mockResolvedValueOnce(success(true));

    render(<RegulatoryUpdatesSetting canManage />);

    expect(await screen.findByText('تعذر تحميل إعداد استقبال التحديثات التنظيمية.')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    const toggle = await screen.findByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });
});