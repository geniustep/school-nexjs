// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReferenceSubjectCreateForm } from './reference-subject-create-form';
import type { LevelOptionsPayload } from '@/types/academic-levels';

const createMock = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const sessionUser = vi.hoisted(() =>
  vi.fn(() => ({
    id: 1,
    name: 'PM',
    email: null,
    role: 'admin' as const,
    permissions: [] as string[],
    school: null,
    effective_capabilities: ['reference.subject.manage'],
  })),
);

vi.mock('@/features/admin/subjects/api/reference-subject-create-api', () => ({
  createReferenceSubject: (...args: unknown[]) => createMock(...args),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => sessionUser(),
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: toastSuccess, error: toastError }),
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string) => key,
}));

vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: () => ({
    data: {
      cycles: [
        { id: 1, code: 'PRE', name: 'أولي', sequence: 1 },
        { id: 2, code: 'PRIM', name: 'ابتدائي', sequence: 2 },
      ],
      permissions: { can_enable: true },
      reference_levels: [
        {
          id: 101,
          code: 'PRE1',
          name: 'الأولى',
          sequence: 1,
          active: true,
          supports_tracks: false,
          enabled: false,
          can_enable: true,
          link_status: 'not_enabled',
          cycle: { id: 1, code: 'PRE', name: 'أولي', sequence: 1 },
        },
        {
          id: 201,
          code: 'P1',
          name: 'الأولى ابتدائي',
          sequence: 1,
          active: true,
          supports_tracks: false,
          enabled: false,
          can_enable: true,
          link_status: 'not_enabled',
          cycle: { id: 2, code: 'PRIM', name: 'ابتدائي', sequence: 2 },
        },
      ],
    } satisfies LevelOptionsPayload,
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));

function fillRequiredAndSubmit() {
  fireEvent.change(screen.getByLabelText('admin.referenceSubjects.fields.name'), {
    target: { value: 'مادة مرجعية' },
  });
  fireEvent.change(screen.getByLabelText('admin.referenceSubjects.fields.code'), {
    target: { value: 'REF1' },
  });
  fireEvent.change(screen.getByLabelText('admin.referenceSubjects.fields.cycle'), {
    target: { value: '1' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'admin.referenceSubjects.actions.create' }));
}

describe('ReferenceSubjectCreateForm', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    createMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    sessionUser.mockImplementation(() => ({
      id: 1,
      name: 'PM',
      email: null,
      role: 'admin' as const,
      permissions: [],
      school: null,
      effective_capabilities: ['reference.subject.manage'],
    }));
  });

  it('hides the form without capability', () => {
    sessionUser.mockImplementation(() => ({
      id: 2,
      name: 'Mgr',
      email: null,
      role: 'admin' as const,
      permissions: ['manage_classes'],
      school: null,
      admin_kind: 'school_manager',
      effective_capabilities: ['manage_classes'],
    }));
    render(<ReferenceSubjectCreateForm />);
    expect(screen.getByText('admin.referenceSubjects.errors.manageForbidden')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'admin.referenceSubjects.actions.create' })).toBeNull();
  });

  it('filters levels by cycle and clears incompatible selections', () => {
    render(<ReferenceSubjectCreateForm />);
    fireEvent.change(screen.getByLabelText('admin.referenceSubjects.fields.cycle'), {
      target: { value: '1' },
    });
    expect(screen.getByRole('checkbox', { name: /الأولى/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /ابتدائي/ })).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: /الأولى/ }));
    fireEvent.change(screen.getByLabelText('admin.referenceSubjects.fields.cycle'), {
      target: { value: '2' },
    });
    expect(screen.getByRole('checkbox', { name: /ابتدائي/ })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /PRE1/ })).toBeNull();
  });

  it('maps 409 conflict onto the code field', async () => {
    createMock.mockResolvedValue({
      ok: false,
      error: { code: 'reference_subject_code_conflict', message: 'dup', details: { status: 409 } },
    });
    render(<ReferenceSubjectCreateForm />);
    fillRequiredAndSubmit();
    await waitFor(() => {
      expect(screen.getAllByText('admin.referenceSubjects.errors.codeConflict').length).toBeGreaterThan(
        0,
      );
    });
    expect(screen.getByDisplayValue('REF1').getAttribute('aria-invalid')).toBe('true');
  });

  it('maps mismatch onto levels and never enables', async () => {
    createMock.mockResolvedValue({
      ok: false,
      error: {
        code: 'reference_subject_cycle_level_mismatch',
        message: 'mismatch',
        details: { status: 422 },
      },
    });
    render(<ReferenceSubjectCreateForm />);
    fillRequiredAndSubmit();
    await waitFor(() => {
      expect(
        screen.getAllByText('admin.referenceSubjects.errors.cycleLevelMismatch').length,
      ).toBeGreaterThan(0);
    });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('submits create and shows enable CTA without a second enable call', async () => {
    createMock.mockResolvedValue({
      ok: true,
      data: {
        id: 9,
        name: 'مادة مرجعية',
        code: 'REF1',
        cycle: { id: 1, code: 'PRE', name: 'أولي' },
        levels: [{ id: 101, code: 'PRE1', name: 'الأولى' }],
        subject_category: 'other',
        is_mandatory_default: false,
        is_optional_default: false,
        weekly_sessions_default: 0,
        external_reference_code: null,
        source_note: null,
        active: true,
        scope: 'global_reference_catalog',
      },
    });

    render(<ReferenceSubjectCreateForm />);
    fillRequiredAndSubmit();

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
    });
    expect(createMock.mock.calls[0]?.[0]?.level_ids).toEqual([101]);
    expect(screen.getByText('admin.referenceSubjects.success')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'admin.referenceSubjects.actions.enable' }).getAttribute('href'),
    ).toBe('/admin/settings/academic-setup/subjects');
  });

  it('shows 403 manage forbidden banner', async () => {
    createMock.mockResolvedValue({
      ok: false,
      error: {
        code: 'reference_subject_manage_forbidden',
        message: 'forbidden',
        details: { status: 403 },
      },
    });
    render(<ReferenceSubjectCreateForm />);
    fillRequiredAndSubmit();
    await waitFor(() => {
      expect(screen.getAllByText('admin.referenceSubjects.errors.manageForbidden').length).toBeGreaterThan(
        0,
      );
    });
  });

  it('disables submit while saving to prevent double submit', async () => {
    let resolveCreate: (value: unknown) => void = () => undefined;
    createMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    render(<ReferenceSubjectCreateForm />);
    fillRequiredAndSubmit();
    const submitBtn = screen.getByRole('button', { name: 'common.saving' });
    expect(submitBtn.hasAttribute('disabled')).toBe(true);
    fireEvent.click(submitBtn);
    expect(createMock).toHaveBeenCalledTimes(1);
    resolveCreate({
      ok: true,
      data: {
        id: 1,
        name: 'مادة مرجعية',
        code: 'REF1',
        cycle: { id: 1, code: 'PRE', name: 'أولي' },
        levels: [{ id: 101, code: 'PRE1', name: 'الأولى' }],
        subject_category: 'other',
        is_mandatory_default: false,
        is_optional_default: false,
        weekly_sessions_default: 0,
        external_reference_code: null,
        source_note: null,
        active: true,
        scope: 'global_reference_catalog',
      },
    });
    await waitFor(() => {
      expect(screen.getByText('admin.referenceSubjects.success')).toBeTruthy();
    });
  });
});
