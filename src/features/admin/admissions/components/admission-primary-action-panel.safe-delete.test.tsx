// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdmissionPrimaryActionPanel } from './admission-primary-action-panel';
import type { AdmissionDetail } from '@/types/admission';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/features/auth/admin-session-context', () => ({
  useAdminSession: () => ({ activeSchoolId: 3 }),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('../api/admissions-api', () => ({
  executeAdmissionAction: vi.fn(),
  deleteAdmission: vi.fn(),
  fetchAdmission: vi.fn(),
}));

function detail(partial: Partial<AdmissionDetail>): AdmissionDetail {
  return {
    id: 62,
    student_name: 'أحمد',
    state: 'new',
    application_status: 'new',
    allowed_actions: {},
    modern_allowed_actions: [
      { code: 'log_contact', allowed: true },
      { code: 'close', allowed: true },
    ],
    primary_next_action: { code: 'log_contact' },
    can_delete: false,
    delete_block_reason: false,
    ...partial,
  } as AdmissionDetail;
}

describe('AdmissionPrimaryActionPanel safe delete visibility', () => {
  afterEach(() => cleanup());

  it('shows safe delete when can_delete=true', () => {
    render(
      <AdmissionPrimaryActionPanel
        detail={detail({ can_delete: true })}
        admissionId={62}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.getByTestId('admission-safe-delete-action')).toBeTruthy();
  });

  it('hides safe delete when can_delete=false', () => {
    render(
      <AdmissionPrimaryActionPanel
        detail={detail({ can_delete: false })}
        admissionId={62}
        onUpdated={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('admission-safe-delete-action')).toBeNull();
  });
});
