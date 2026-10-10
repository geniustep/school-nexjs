// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TeacherAssignmentMatrixPicker } from './teacher-assignment-matrix-picker';
import type { TeachingAssignment } from '@/types/academic-setup';
import type { Level, SchoolClass, Subject } from '@/types/class';

const mock = vi.hoisted(() => ({
  assignments: [] as TeachingAssignment[],
  pagination: null as { page: number; total: number; page_size: number; total_pages: number } | null,
  apiPost: vi.fn(),
  reload: vi.fn().mockResolvedValue(undefined),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ api: { post: mock.apiPost } }));
vi.mock('@/lib/api/endpoints', () => ({
  endpoints: { admin: { teachingAssignments: '/admin/teaching-assignments' } },
}));
vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: () => ({
    data: mock.assignments, meta: mock.pagination ? { pagination: mock.pagination } : null,
    loading: false, error: null, reload: mock.reload,
  }),
}));
vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({ success: mock.toastSuccess, error: mock.toastError }),
}));
vi.mock('@/features/i18n/locale-context', () => ({ useT: () => (key: string) => key }));

const subject = { id: 10, name: 'الفيزياء والكيمياء', active: true } as Subject;
const levels = [{ id: 20, name: 'الأولى إعدادي', subjects: [subject] }] as Level[];
const classes = [{
  id: 30, name: '1APIC-1', status: 'active', level: { id: 20 },
  subjects: [subject],
}] as SchoolClass[];

function assignment(allowed = true): TeachingAssignment {
  return {
    id: 77, active: true, state: 'active', role: 'main', weekly_hours: 2,
    school: { id: 1, name: 'Nibras' },
    academic_year: { id: 8, name: '2026-2027' },
    class: { id: 30, name: '1APIC-1' },
    subject: { id: 10, name: 'الفيزياء والكيمياء' },
    teacher: { id: 99, name: 'الأستاذ السابق' },
    allowed_actions: { replace: allowed },
  } as TeachingAssignment;
}

function mount(props: { replacementBlocked?: boolean; canManage?: boolean } = {}) {
  return render(
    <TeacherAssignmentMatrixPicker
      levels={levels} classes={classes} subjects={[subject]}
      selectedPairs={[]}
      eligibility={{ subjectIds: [10], cycleIds: [], levelIds: [20] }}
      currentTeacherId={57} teacherName="الأستاذة الجديدة" academicYearId={8}
      disabled={props.canManage === false}
      replacementBlocked={props.replacementBlocked}
      onChange={vi.fn()} onReplaced={vi.fn()}
    />,
  );
}

describe('inline teacher replacement from locked assignment cell', () => {
  beforeEach(() => {
    mock.assignments = [assignment()];
    mock.pagination = null;
    mock.apiPost.mockReset();
    mock.reload.mockClear();
    mock.toastSuccess.mockClear();
    mock.toastError.mockClear();
  });
  afterEach(cleanup);

  it('shows the current owner and a contextual action only for its occupied cell', async () => {
    mount();
    expect(await screen.findByText('الأستاذ السابق')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'admin.teacherProfile.inlineReplaceAction' })).toHaveLength(1);
  });

  it('blocks replacement when permissions or pending unsaved changes prevent it', async () => {
    mount({ replacementBlocked: true });
    expect(await screen.findByText('الأستاذ السابق')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'admin.teacherProfile.inlineReplaceAction' })).toBeNull();
    cleanup();
    mount({ canManage: false });
    expect(screen.queryByRole('button', { name: 'admin.teacherProfile.inlineReplaceAction' })).toBeNull();
  });

  it('explains a denied backend capability without offering replacement', async () => {
    mock.assignments = [assignment(false)];
    mount();
    expect(await screen.findByText('admin.teacherProfile.inlineReplaceBackendBlocked')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'admin.teacherProfile.inlineReplaceAction' })).toBeNull();
    expect(mock.apiPost).not.toHaveBeenCalled();
  });

  it('explains unsaved changes without sending a mutation', async () => {
    mount({ replacementBlocked: true });
    expect(await screen.findByText('admin.teacherProfile.inlineReplaceUnsaved')).toBeTruthy();
    expect(mock.apiPost).not.toHaveBeenCalled();
  });

  it('allows 500 complete occupancy rows when pagination confirms total=500', async () => {
    mock.assignments = [
      assignment(),
      ...Array.from({ length: 499 }, (_, i) => ({
        ...assignment(),
        id: 1000 + i,
        class: { id: 1000 + i, name: `Other ${i}` },
      })),
    ];
    mock.pagination = { page: 1, page_size: 500, total: 500, total_pages: 1 };
    mount();
    expect(await screen.findByRole('button', { name: 'admin.teacherProfile.inlineReplaceAction' })).toBeTruthy();
  });

  it('fails closed on truncated occupancy when pagination reports more rows', async () => {
    mock.assignments = [assignment()];
    mock.pagination = { page: 1, page_size: 500, total: 501, total_pages: 2 };
    mount();
    expect(await screen.findByText('admin.teacherProfile.inlineReplaceUnavailableData')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'admin.teacherProfile.inlineReplaceAction' })).toBeNull();
    expect(mock.apiPost).not.toHaveBeenCalled();
  });

  it('requires backend replace capability and does not mutate on cancel', async () => {
    mock.assignments = [assignment(false)];
    mount();
    expect(await screen.findByText('الأستاذ السابق')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'admin.teacherProfile.inlineReplaceAction' })).toBeNull();
    expect(mock.apiPost).not.toHaveBeenCalled();
  });

  it('posts a single atomic replacement by exact assignment ID and refreshes occupancy', async () => {
    mock.apiPost.mockResolvedValue({ success: true, data: { warnings: [] } });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'admin.teacherProfile.inlineReplaceAction' }));
    expect(screen.getByText('الأستاذة الجديدة')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'تغيير الأستاذ' } });
    fireEvent.change(screen.getByLabelText('admin.teacherProfile.inlineReplaceDate'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'admin.teacherProfile.inlineReplaceConfirm' }));
    await waitFor(() => expect(mock.apiPost).toHaveBeenCalledTimes(1));
    expect(mock.apiPost).toHaveBeenCalledWith('/admin/teaching-assignments/77/replace', {
      new_teacher_id: 57, effective_from: '2026-10-10',
      reason: 'تغيير الأستاذ', role: 'main',
    });
    await waitFor(() => expect(mock.reload).toHaveBeenCalledTimes(1));
  });
});
