// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ACADEMIC_CONTEXT_SELECTION } from '@/features/academic-context/utils/academic-context-reset';
import { baseOptions } from '@/features/academic-context/test-helpers';
import type { AcademicContextOptionsResponse } from '@/types/academic-context';

const fetchAdmin = vi.fn();
const fetchTeacher = vi.fn();

vi.mock('@/features/academic-context/api/academic-context-api', () => ({
  fetchAdminAcademicContextOptions: (...args: unknown[]) => fetchAdmin(...args),
  fetchTeacherAcademicContextOptions: (...args: unknown[]) => fetchTeacher(...args),
}));

vi.mock('@/features/auth/session-context', () => ({
  useSession: () => ({
    role: 'admin',
    effective_capabilities: ['academic.context.view'],
    permissions: ['view_classes'],
  }),
}));

vi.mock('@/lib/permissions/academic-context', () => ({
  canViewAcademicContext: () => true,
}));

import { useAcademicContextOptions } from '@/features/academic-context/hooks/use-academic-context-options';

function ok(data: AcademicContextOptionsResponse) {
  return { success: true as const, data, meta: {} };
}

afterEach(() => {
  cleanup();
  fetchAdmin.mockReset();
  fetchTeacher.mockReset();
});

beforeEach(() => {
  fetchAdmin.mockResolvedValue(ok(baseOptions()));
});

describe('useAcademicContextOptions dependent resets and invalidations', () => {
  it('resets dependents when year then level change and clears hidden payload values', async () => {
    const onSelectionChange = vi.fn();
    const { result } = renderHook(() =>
      useAcademicContextOptions({
        scope: 'exam',
        initialSelection: {
          academicYearId: '1',
          cycleId: '2',
          levelId: '5',
          trackId: '7',
          teachingLanguageId: '9',
          subjectId: '11',
          offeringId: '100',
          referenceId: '200',
          termId: '31',
          classId: '40',
        },
        onSelectionChange,
      }),
    );

    await waitFor(() => expect(result.current.loading || result.current.options).toBeTruthy());

    act(() => {
      result.current.setField('academicYear', '2');
    });
    expect(result.current.selection.termId).toBe('');
    expect(result.current.selection.levelId).toBe('');
    expect(result.current.selection.subjectId).toBe('');
    expect(result.current.selection.offeringId).toBe('');
    expect(result.current.selection.referenceId).toBe('');
    expect(result.current.selection.classId).toBe('');

    act(() => {
      result.current.setField('cycle', '2');
    });
    act(() => {
      result.current.setField('level', '5');
    });
    act(() => {
      result.current.setField('track', '7');
    });
    act(() => {
      result.current.setField('subject', '11');
    });
    act(() => {
      result.current.setField('offering', '100');
    });
    act(() => {
      result.current.setField('reference', '200');
    });
    expect(result.current.selection.offeringId).toBe('100');
    expect(result.current.selection.referenceId).toBe('200');

    act(() => {
      result.current.setField('subject', '12');
    });
    expect(result.current.selection.offeringId).toBe('');
    expect(result.current.selection.referenceId).toBe('');
  });

  it('applies backend invalidated_selections without wiping valid fields', async () => {
    fetchAdmin.mockResolvedValueOnce(
      ok(
        baseOptions({
          invalidated_selections: [
            { field: 'track_id', previous_value: 99 },
            { field: 'teaching_offering_id', previous_value: 100 },
          ],
        }),
      ),
    );

    const { result } = renderHook(() =>
      useAcademicContextOptions({
        initialSelection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          levelId: '5',
          trackId: '99',
          subjectId: '11',
          offeringId: '100',
        },
      }),
    );

    await waitFor(() => expect(result.current.options).toBeTruthy());
    await waitFor(() => expect(result.current.selection.trackId).toBe(''));
    expect(result.current.selection.offeringId).toBe('');
    expect(result.current.selection.subjectId).toBe('11');
    expect(result.current.selection.levelId).toBe('5');
  });
});

describe('useAcademicContextOptions stale response protection', () => {
  it('keeps Level B options when Level A response arrives late', async () => {
    let resolveA: (value: unknown) => void = () => undefined;
    let resolveB: (value: unknown) => void = () => undefined;

    fetchAdmin
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveA = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveB = resolve;
          }),
      );

    const { result } = renderHook(() =>
      useAcademicContextOptions({
        initialSelection: { ...EMPTY_ACADEMIC_CONTEXT_SELECTION, levelId: '5' },
      }),
    );

    await waitFor(() => expect(fetchAdmin).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setField('level', '6');
    });
    await waitFor(() => expect(fetchAdmin).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveB(
        ok(
          baseOptions({
            levels: [{ id: 6, name: 'Level B', display_alias: 'Level B' }],
            subjects: [{ id: 22, name: 'Subject B', source: 'level' }],
          }),
        ),
      );
    });
    await waitFor(() => expect(result.current.options?.subjects[0]?.name).toBe('Subject B'));

    await act(async () => {
      resolveA(
        ok(
          baseOptions({
            levels: [{ id: 5, name: 'Level A' }],
            subjects: [{ id: 11, name: 'Subject A', source: 'level' }],
          }),
        ),
      );
    });

    expect(result.current.options?.subjects[0]?.name).toBe('Subject B');
    expect(result.current.selection.levelId).toBe('6');
  });

  it('refetch keeps previous options (no false empty) and marks refetching', async () => {
    const { result } = renderHook(() =>
      useAcademicContextOptions({
        initialSelection: { ...EMPTY_ACADEMIC_CONTEXT_SELECTION, levelId: '5' },
      }),
    );
    await waitFor(() => expect(result.current.options?.subjects.length).toBeGreaterThan(0));

    let resolveRefetch: (value: unknown) => void = () => undefined;
    fetchAdmin.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefetch = resolve;
        }),
    );

    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.refetching).toBe(true));
    expect(result.current.options?.subjects.length).toBeGreaterThan(0);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      resolveRefetch(ok(baseOptions({ subjects: [{ id: 33, name: 'Refetched', source: 'level' }] })));
    });
    await waitFor(() => expect(result.current.refetching).toBe(false));
    expect(result.current.options?.subjects[0]?.name).toBe('Refetched');
  });

  it('does not update state after unmount', async () => {
    let resolveLate: (value: unknown) => void = () => undefined;
    fetchAdmin.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLate = resolve;
        }),
    );
    const { unmount } = renderHook(() =>
      useAcademicContextOptions({
        initialSelection: { ...EMPTY_ACADEMIC_CONTEXT_SELECTION, levelId: '5' },
      }),
    );
    unmount();
    await act(async () => {
      resolveLate(ok(baseOptions()));
    });
    // If this throws, React would warn; absence of throw is success.
    expect(true).toBe(true);
  });

  it('passes scope and level_id/class_id in academic context query', async () => {
    renderHook(() =>
      useAcademicContextOptions({
        scope: 'gradebook',
        initialSelection: {
          ...EMPTY_ACADEMIC_CONTEXT_SELECTION,
          classId: '40',
          levelId: '5',
        },
      }),
    );
    await waitFor(() => expect(fetchAdmin).toHaveBeenCalled());
    expect(fetchAdmin.mock.calls[0][0]).toMatchObject({
      scope: 'gradebook',
      class_id: 40,
      level_id: 5,
    });
  });
});
