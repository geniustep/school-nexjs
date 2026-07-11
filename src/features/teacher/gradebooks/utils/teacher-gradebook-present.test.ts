import { describe, expect, it } from 'vitest';
import {
  canEditGradebookEntries,
  visibleGradebookLifecycleActions,
} from '@/features/admin/gradebooks/utils/gradebook-allowed-actions';
import {
  adaptTeacherGradebookList,
  mapTeacherGradebookDetail,
  teacherCannotSeeAdminActions,
} from './teacher-gradebook-present';
import type { GradebookDetail, GradebookSummary } from '@/types/gradebook';

const sampleList: GradebookSummary[] = [
  {
    id: 12,
    subject: { id: 1, name: 'رياضيات' },
    class: { id: 2, name: '6أ' },
    term: { id: 3, name: 'الدورة 1' },
    state: 'open',
    completion_percent: 40,
    students_count: 28,
  },
];

const sampleDetail = (allowed: GradebookDetail['allowed_actions']): GradebookDetail => ({
  id: 12,
  context: { state: 'open', subject: { id: 1, name: 'رياضيات' } },
  structure: { mode: 'simple', slots: [], cells: [] },
  roster: [],
  matrix: [],
  completion: {
    completion_percent: 40,
    unresolved_entries: 10,
    students_total: 28,
    cells_total: 28,
  },
  allowed_actions: allowed,
});

describe('teacher gradebook list adapter', () => {
  it('maps teacher API rows without inventing filters', () => {
    expect(adaptTeacherGradebookList(sampleList)).toEqual([
      {
        id: 12,
        subject: 'رياضيات',
        className: '6أ',
        term: 'الدورة 1',
        state: 'open',
        completionPercent: 40,
        studentsCount: 28,
        href: '/teacher/assessment/gradebooks/12',
      },
    ]);
  });

  it('returns empty list for null/empty payloads', () => {
    expect(adaptTeacherGradebookList(null)).toEqual([]);
    expect(adaptTeacherGradebookList([])).toEqual([]);
  });
});

describe('teacher gradebook detail mapping', () => {
  it('maps detail and respects edit_entries / submit', () => {
    const mapped = mapTeacherGradebookDetail(
      sampleDetail({ edit_entries: true, submit: true, build_roster: true, publish: true }),
    );
    expect(mapped.canEditEntries).toBe(true);
    expect(mapped.canSubmit).toBe(true);
    expect(mapped.visibleLifecycleActions).toEqual(['submit']);
    expect(mapped.mode).toBe('simple');
  });

  it('blocks editing when edit_entries is false', () => {
    expect(canEditGradebookEntries('teacher', { edit_entries: false, submit: true })).toBe(false);
    expect(canEditGradebookEntries('teacher', { submit: true })).toBe(false);
  });
});

describe('teacher cannot see admin actions', () => {
  it('hides admin lifecycle even if backend flags them true', () => {
    const allowed = {
      edit_entries: true,
      submit: true,
      build_roster: true,
      sync_roster: true,
      validate: true,
      publish: true,
      lock: true,
      open: true,
    };
    expect(teacherCannotSeeAdminActions(allowed)).toBe(true);
    expect(visibleGradebookLifecycleActions('teacher', allowed)).toEqual(['submit']);
  });

  it('hides submit when not allowed', () => {
    expect(visibleGradebookLifecycleActions('teacher', { edit_entries: true })).toEqual([]);
  });
});
