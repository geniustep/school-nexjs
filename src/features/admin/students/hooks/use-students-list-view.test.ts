import { describe, expect, it } from 'vitest';
import {
  parseStudentsListViewPreference,
  STUDENTS_LIST_VIEW_DEFAULT,
} from './use-students-list-view';

describe('parseStudentsListViewPreference', () => {
  it('defaults to kanban when no value is stored', () => {
    expect(parseStudentsListViewPreference(null)).toBe('kanban');
    expect(parseStudentsListViewPreference(undefined)).toBe('kanban');
    expect(STUDENTS_LIST_VIEW_DEFAULT).toBe('kanban');
  });

  it('returns saved list preference', () => {
    expect(parseStudentsListViewPreference('list')).toBe('list');
  });

  it('returns saved kanban preference', () => {
    expect(parseStudentsListViewPreference('kanban')).toBe('kanban');
  });

  it('falls back to kanban for invalid stored values', () => {
    expect(parseStudentsListViewPreference('table')).toBe('kanban');
    expect(parseStudentsListViewPreference('')).toBe('kanban');
  });
});
