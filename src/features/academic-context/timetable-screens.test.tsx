// @vitest-environment happy-dom

/**
 * Timetable Academic Context screen/flow tests.
 * Requirement create UX is covered by Slot create form (no separate Requirement screen).
 */

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { baseOptions } from '@/features/academic-context/test-helpers';
import type { AcademicContextOptionsResponse } from '@/types/academic-context';
import type { TimetableSlot } from '@/types/timetable';

const fetchAdmin = vi.fn();
const fetchTeacher = vi.fn();
const apiPost = vi.fn();
const useAdminResource = vi.fn();

vi.mock('@/features/academic-context/api/academic-context-api', () => ({
  fetchAdminAcademicContextOptions: (...args: unknown[]) => fetchAdmin(...args),
  fetchTeacherAcademicContextOptions: (...args: unknown[]) => fetchTeacher(...args),
}));

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
    post: (...args: unknown[]) => apiPost(...args),
  },
}));

vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: (...args: unknown[]) => useAdminResource(...args),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    role: 'admin',
    permissions: ['manage_timetable', 'view_classes', 'view_teachers'],
    effective_capabilities: ['academic.context.view'],
  }),
}));

vi.mock('@/lib/permissions/permissions', () => ({
  hasPermission: () => true,
}));

vi.mock('@/lib/permissions/academic-context', () => ({
  canViewAcademicContext: () => true,
}));

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, vars?: Record<string, string | number>) => {
    if (vars?.language) return `${key}:${vars.language}`;
    if (vars?.count != null) return `${key}:${vars.count}`;
    return key;
  },
}));

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/features/admin/confirm-action-button', () => ({
  ConfirmActionButton: () => <button type="button">archive</button>,
}));

vi.mock('@/features/admin/timetable/admin-timetable.css', () => ({}));

import { AdminTimetablePanel } from '@/features/admin/admin-timetable-panel';

function ok(data: AcademicContextOptionsResponse) {
  return { success: true as const, data, meta: {} };
}

function slot(overrides: Partial<TimetableSlot> & { teaching_offering_id?: number | null } = {}): TimetableSlot & {
  teaching_offering_id?: number | null;
} {
  return {
    id: 1,
    day: 'monday',
    start_time: '08:30',
    end_time: '10:00',
    room: 'A1',
    class: { id: 40, name: '6A' },
    subject: { id: 11, name: 'الرياضيات' },
    teacher: { id: 3, name: 'Ada' },
    teaching_offering_id: 100,
    ...overrides,
  };
}

function mockResources(slots: TimetableSlot[] = [slot()]) {
  useAdminResource.mockImplementation((path: string) => {
    if (path.includes('timetable') && !path.includes('slots')) {
      return {
        data: slots,
        loading: false,
        error: null,
        reload: vi.fn(),
        meta: null,
      };
    }
    if (path.includes('classes')) {
      return {
        data: [{ id: 40, name: '6A' }],
        loading: false,
        error: null,
        reload: vi.fn(),
        meta: null,
      };
    }
    return {
      data: [{ id: 3, name: 'Ada' }],
      loading: false,
      error: null,
      reload: vi.fn(),
      meta: null,
    };
  });
}

afterEach(() => {
  cleanup();
  fetchAdmin.mockReset();
  fetchTeacher.mockReset();
  apiPost.mockReset();
  useAdminResource.mockReset();
});

beforeEach(() => {
  mockResources();
  fetchAdmin.mockResolvedValue(ok(baseOptions()));
  fetchTeacher.mockResolvedValue(ok(baseOptions()));
  apiPost.mockResolvedValue({ success: true, data: {}, meta: {} });
});

describe('Timetable Slot create (Requirement-equivalent Academic Context UX)', () => {
  it('loads effective subjects from Academic Context with scope=timetable and class_id', async () => {
    const user = userEvent.setup();
    render(<AdminTimetablePanel />);

    await user.click(screen.getByRole('button', { name: 'admin.addSlot' }));

    const classSelect = await screen.findByLabelText(/admin\.selectClass/);
    await user.selectOptions(classSelect, '40');

    await waitFor(() => {
      expect(fetchAdmin).toHaveBeenCalled();
    });

    const lastQuery = fetchAdmin.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastQuery.scope).toBe('timetable');
    expect(String(lastQuery.class_id)).toBe('40');
    expect(fetchTeacher).not.toHaveBeenCalled();

    const subjectSelect = screen.getByLabelText(/admin\.selectSubject/) as HTMLSelectElement;
    const options = within(subjectSelect)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(options.some((t) => t?.includes('الرياضيات'))).toBe(true);
    expect(options.some((t) => /all subjects|جميع المواد/i.test(t ?? ''))).toBe(false);
    expect(document.body.textContent).not.toMatch(/res\.lang/i);
  });

  it('keeps multiple offerings distinct without auto-select and sends teaching_offering_id', async () => {
    const user = userEvent.setup();
    render(<AdminTimetablePanel />);
    await user.click(screen.getByText('admin.addSlot'));

    await user.selectOptions(await screen.findByLabelText(/admin\.selectClass/), '40');
    await waitFor(() => expect(fetchAdmin).toHaveBeenCalled());

    await user.selectOptions(screen.getByLabelText(/admin\.selectSubject/), '11');
    await waitFor(() => {
      const q = fetchAdmin.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(String(q.subject_id ?? '')).toBe('11');
    });

    const offering = screen.getByLabelText(/academicContext\.fields\.offering/) as HTMLSelectElement;
    expect(offering.value).toBe('');
    const offeringLabels = within(offering)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(offeringLabels.filter((t) => t && !t.includes('placeholders')).length).toBeGreaterThanOrEqual(2);

    await user.selectOptions(offering, '100');
    expect(screen.getByText(/academicContext\.language\.derivedFromOffering:العربية/)).toBeTruthy();
    expect(screen.getByText(/academicContext\.fields\.reference/)).toBeTruthy();
    expect(screen.getByText(/المنير في الرياضيات/)).toBeTruthy();

    await user.selectOptions(screen.getByLabelText(/admin\.selectTeacher/), '3');
    await user.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const [, payload] = apiPost.mock.calls.find((c) => String(c[0]).includes('/slots') && !String(c[0]).includes('update')) ?? [];
    expect(payload).toMatchObject({
      class_id: 40,
      subject_id: 11,
      teaching_offering_id: 100,
      teacher_id: 3,
    });
  });

  it('clears subject and offering when class changes', async () => {
    const user = userEvent.setup();
    useAdminResource.mockImplementation((path: string) => {
      if (path.includes('timetable') && !path.includes('slots')) {
        return { data: [], loading: false, error: null, reload: vi.fn(), meta: null };
      }
      if (path.includes('classes')) {
        return {
          data: [
            { id: 40, name: '6A' },
            { id: 41, name: '6B' },
          ],
          loading: false,
          error: null,
          reload: vi.fn(),
          meta: null,
        };
      }
      return { data: [{ id: 3, name: 'Ada' }], loading: false, error: null, reload: vi.fn(), meta: null };
    });

    render(<AdminTimetablePanel />);
    await user.click(screen.getByText('admin.addSlot'));
    await user.selectOptions(await screen.findByLabelText(/admin\.selectClass/), '40');
    await waitFor(() => expect(fetchAdmin).toHaveBeenCalled());
    await user.selectOptions(screen.getByLabelText(/admin\.selectSubject/), '11');
    await user.selectOptions(screen.getByLabelText(/academicContext\.fields\.offering/), '100');

    await user.selectOptions(screen.getByLabelText(/admin\.selectClass/), '41');
    expect((screen.getByLabelText(/admin\.selectSubject/) as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText(/academicContext\.fields\.offering/) as HTMLSelectElement).value).toBe('');
  });
});

describe('Timetable Slot edit', () => {
  it('shows legacy null offering as readable and updates payload without hidden stale offering', async () => {
    const user = userEvent.setup();
    mockResources([slot({ teaching_offering_id: null })]);
    render(<AdminTimetablePanel />);

    await user.click(screen.getByText('common.edit'));
    expect(await screen.findByText('academicContext.hints.legacyMissingOffering')).toBeTruthy();

    await user.selectOptions(screen.getByLabelText(/admin\.selectSubject/), '11');
    await waitFor(() => expect(fetchAdmin).toHaveBeenCalled());
    // leave offering empty — legacy
    await user.click(screen.getByRole('button', { name: 'common.save' }));

    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    const updateCall = apiPost.mock.calls.find((c) => String(c[0]).includes('/update'));
    expect(updateCall?.[1]).toMatchObject({
      subject_id: 11,
    });
    expect(updateCall?.[1].teaching_offering_id).toBeUndefined();
  });

  it('does not expose Delivery or Jathatha actions from Academic Context integration', () => {
    render(<AdminTimetablePanel />);
    expect(document.body.textContent).not.toMatch(/jathatha|actual.?delivery|delivery\.create/i);
    expect(screen.queryByText(/teacher\.delivery/)).toBeNull();
  });
});

describe('Timetable list filters', () => {
  it('filters by class/teacher/day without All Subjects and without admin subjects endpoint', async () => {
    const user = userEvent.setup();
    mockResources([
      slot({ id: 1, class: { id: 40, name: '6A' }, teacher: { id: 3, name: 'Ada' }, day: 'monday' }),
      slot({
        id: 2,
        class: { id: 41, name: '6B' },
        teacher: { id: 4, name: 'Bea' },
        day: 'tuesday',
        subject: { id: 12, name: 'Science' },
      }),
    ]);
    useAdminResource.mockImplementation((path: string) => {
      if (path.includes('timetable') && !path.includes('slots')) {
        return {
          data: [
            slot({ id: 1, class: { id: 40, name: '6A' }, teacher: { id: 3, name: 'Ada' }, day: 'monday' }),
            slot({
              id: 2,
              class: { id: 41, name: '6B' },
              teacher: { id: 4, name: 'Bea' },
              day: 'tuesday',
              subject: { id: 12, name: 'Science' },
            }),
          ],
          loading: false,
          error: null,
          reload: vi.fn(),
          meta: null,
        };
      }
      if (path.includes('classes')) {
        return {
          data: [
            { id: 40, name: '6A' },
            { id: 41, name: '6B' },
          ],
          loading: false,
          error: null,
          reload: vi.fn(),
          meta: null,
        };
      }
      return {
        data: [
          { id: 3, name: 'Ada' },
          { id: 4, name: 'Bea' },
        ],
        loading: false,
        error: null,
        reload: vi.fn(),
        meta: null,
      };
    });

    render(<AdminTimetablePanel />);
    expect(screen.getByLabelText('nav.classes')).toBeTruthy();
    expect(screen.getByLabelText('nav.teachers')).toBeTruthy();
    expect(screen.getByLabelText('admin.timetableList.day')).toBeTruthy();
    expect(screen.queryByLabelText('admin.selectSubject')).toBeNull();
    expect(document.body.textContent).not.toMatch(/All Subjects|جميع المواد/i);

    await user.selectOptions(screen.getByLabelText('nav.classes'), '40');
    expect(screen.getByText('الرياضيات')).toBeTruthy();
    expect(screen.queryByText('Science')).toBeNull();

    await user.click(screen.getByText('admin.timetableList.resetFilters'));
    expect(screen.getByText('Science')).toBeTruthy();
  });

  it('shows no-match empty state when filters exclude all slots', async () => {
    const user = userEvent.setup();
    useAdminResource.mockImplementation((path: string) => {
      if (path.includes('timetable') && !path.includes('slots')) {
        return { data: [slot()], loading: false, error: null, reload: vi.fn(), meta: null };
      }
      if (path.includes('classes')) {
        return {
          data: [
            { id: 40, name: '6A' },
            { id: 99, name: 'EmptyClass' },
          ],
          loading: false,
          error: null,
          reload: vi.fn(),
          meta: null,
        };
      }
      return { data: [{ id: 3, name: 'Ada' }], loading: false, error: null, reload: vi.fn(), meta: null };
    });

    render(<AdminTimetablePanel />);
    await user.selectOptions(screen.getByLabelText('nav.classes'), '99');
    expect(screen.getByText('admin.timetableList.noMatch.title')).toBeTruthy();
  });
});

describe('Weekly Slot ≠ Session Occurrence', () => {
  it('keeps Weekly Slot form semantics without occurrence delivery actions', () => {
    render(<AdminTimetablePanel />);
    expect(screen.getAllByText(/admin\.timetableList\.slotsCount/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'admin.addSlot' })).toBeTruthy();
    expect(document.body.innerHTML).not.toMatch(/session-occurrence|create_delivery/i);
  });
});
