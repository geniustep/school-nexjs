// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './toast';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

function WarningTrigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.warning('تحذير مترجم')}>
      trigger-warning
    </button>
  );
}

afterEach(() => cleanup());

describe('Toast warning tone', () => {
  it('renders warnings distinctly from errors', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <WarningTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'trigger-warning' }));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('تحذير مترجم');
    expect(alert.className).toContain('toast--warning');
    expect(alert.className).not.toContain('toast--error');
  });
});
