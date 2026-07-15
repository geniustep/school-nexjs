// @vitest-environment happy-dom

/**
 * 14A compatibility — return targets helpers + wrapper → change_status dialog.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import { AdmissionReturnToStatusDialog } from '../components/admission-return-to-status-dialog';
import {
  canShowReturnToStatusAction,
  normalizeAllowedReturnTargets,
} from './admission-modern-actions';
import { normalizeAdmissionDetail } from './normalize-admission-record';

const executeAdmissionAction = vi.fn();

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 1 }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock('../api/admissions-api', () => ({
  executeAdmissionAction: (...args: unknown[]) => executeAdmissionAction(...args),
  executeAdmissionsBulkAction: vi.fn(),
}));

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
  executeAdmissionAction.mockReset();
});

afterEach(() => cleanup());

describe('14A return targets (preserved)', () => {
  it('normalizes allowed_return_targets without local fallback', () => {
    expect(normalizeAllowedReturnTargets(['new', 'follow_up'])).toEqual(['new', 'follow_up']);
    expect(canShowReturnToStatusAction({
      application_status: 'accepted',
      allowed_return_targets: ['new'],
      modern_allowed_actions: [{ code: 'return_to_status', allowed: true }],
    })).toBe(true);
  });

  it('preserves allowed_return_targets through normalize', () => {
    const normalized = normalizeAdmissionDetail({
      id: 1,
      student_name: 'x',
      state: 'accepted',
      allowed_actions: {},
      allowed_return_targets: ['new', 'decision_pending'],
      allowed_status_targets: ['new', 'decision_pending', 'closed'],
    } as never);
    expect(normalized.allowed_return_targets).toEqual(['new', 'decision_pending']);
    expect(normalized.allowed_status_targets).toEqual(['new', 'decision_pending', 'closed']);
  });

  it('wrapper opens unified change_status dialog with return targets', async () => {
    const user = userEvent.setup();
    executeAdmissionAction.mockResolvedValue({
      success: true,
      data: { id: 9, application_status: 'follow_up' },
      meta: {},
    });
    render(
      <LocaleProvider>
        <AdmissionReturnToStatusDialog
          admissionId={9}
          currentStatus="accepted"
          allowedReturnTargets={['follow_up', 'new']}
          open
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('admission-change-status-dialog')).toBeTruthy();
    await user.type(screen.getByTestId('admission-change-status-note'), 'سبب 14A');
    await user.click(screen.getByTestId('admission-change-status-confirm'));
    await waitFor(() => expect(executeAdmissionAction).toHaveBeenCalled());
    expect(executeAdmissionAction.mock.calls[0][1]).toMatchObject({
      action: 'change_status',
      note: 'سبب 14A',
    });
  });
});
