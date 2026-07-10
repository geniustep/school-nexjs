import { describe, expect, it } from 'vitest';
import {
  ADMISSIONS_LIST_VIEW_DEFAULT,
  parseAdmissionsListViewPreference,
} from '@/features/admin/admissions/hooks/use-admissions-list-view';

describe('parseAdmissionsListViewPreference', () => {
  it('defaults to kanban when storage is empty', () => {
    expect(parseAdmissionsListViewPreference(null)).toBe(ADMISSIONS_LIST_VIEW_DEFAULT);
    expect(parseAdmissionsListViewPreference(undefined)).toBe('kanban');
  });

  it('restores saved view mode', () => {
    expect(parseAdmissionsListViewPreference('table')).toBe('table');
    expect(parseAdmissionsListViewPreference('kanban')).toBe('kanban');
  });

  it('ignores invalid stored values', () => {
    expect(parseAdmissionsListViewPreference('cards')).toBe(ADMISSIONS_LIST_VIEW_DEFAULT);
  });
});
