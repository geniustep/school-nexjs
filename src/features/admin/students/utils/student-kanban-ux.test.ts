import { describe, expect, it } from 'vitest';
import { studentKanbanClassShortLabel, studentKanbanLevelShortLabel } from './student-kanban-class-short-label';
import { resolveStudentKanbanCycleTone } from './student-kanban-cycle-tone';
import type { Student } from '@/types/student';
import type { AcademicClassOption, AcademicLevelOption } from '@/types/student-360';

describe('studentKanbanLevelShortLabel', () => {
  it('prefers level code over long display_alias', () => {
    const levelWithAlias: AcademicLevelOption = {
      id: 1,
      name: 'الأولى ابتدائي',
      code: 'P1',
      display_alias: 'P1 — CP',
    };
    expect(studentKanbanLevelShortLabel(levelWithAlias as Student['level'])).toBe('P1');

    const levelWithCode: AcademicLevelOption = {
      id: 2,
      name: 'P1 — CP · P1A — CP',
      code: 'P1',
    };
    expect(studentKanbanLevelShortLabel(levelWithCode as Student['level'])).toBe('P1');
  });

  it('falls back to compact label when code is missing', () => {
    const levelAliasOnly: AcademicLevelOption = {
      id: 3,
      name: 'P1 — CP',
      display_alias: 'P1',
    };
    expect(studentKanbanLevelShortLabel(levelAliasOnly as Student['level'])).toBe('P1');
  });
});

describe('studentKanbanClassShortLabel', () => {
  it('prefers display_alias and strips long combined labels', () => {
    const classWithAlias: AcademicClassOption = {
      id: 1,
      name: 'P1A — CP',
      display_alias: 'P1A',
    };
    expect(studentKanbanClassShortLabel(classWithAlias as Student['class'])).toBe('P1A');

    const classNameOnly: AcademicClassOption = {
      id: 2,
      name: 'P1 — CP · P1A — CP',
    };
    expect(studentKanbanClassShortLabel(classNameOnly as Student['class'])).toBe('P1');
  });
});

describe('resolveStudentKanbanCycleTone', () => {
  it('maps high school level codes to high_school tone', () => {
    const student = {
      id: 1,
      level: { id: 10, name: 'H1' },
      class: null,
      status: 'active',
      gender: null,
    } as Student;

    expect(resolveStudentKanbanCycleTone(student)).toBe('high_school');
  });
});
