import { describe, expect, it } from 'vitest';
import { mergeAllSchoolsClassLevels } from './all-schools-academic-options';
import type { Level, SchoolClass } from '@/types/class';

function classWithLevel(
  id: number,
  schoolId: number,
  levelId: number,
  levelCode: string,
  levelName: string,
): SchoolClass {
  return {
    id,
    name: `Class ${id}`,
    school: { id: schoolId, name: `School ${schoolId}` },
    code: `C${id}`,
    level: { id: levelId, name: levelName, code: levelCode },
    academic_year: '2026-2027',
    student_count: 0,
    capacity: null,
    teachers: [],
    subjects: [],
    status: 'active',
  };
}

describe('mergeAllSchoolsClassLevels', () => {
  it('keeps concrete school level ids while borrowing canonical cycle metadata', () => {
    const referenceLevels: Level[] = [
      {
        id: 1,
        name: 'Sixième primaire',
        code: 'P6',
        academic_code: 'P6',
        cycle: { id: 20, code: 'primary', name: 'Primary', sequence: 20 },
      },
    ];
    const classes = [
      classWithLevel(11, 101, 501, 'P6', 'Sixième primaire'),
      classWithLevel(22, 202, 902, 'P6', 'Sixième primaire'),
    ];

    const levels = mergeAllSchoolsClassLevels(classes, referenceLevels);
    const schoolA = levels.find((level) => level.id === 501);
    const schoolB = levels.find((level) => level.id === 902);

    expect(schoolA?.cycle).toEqual(referenceLevels[0].cycle);
    expect(schoolB?.cycle).toEqual(referenceLevels[0].cycle);
    expect(schoolA?.id).toBe(501);
    expect(schoolB?.id).toBe(902);
  });

  it('keeps an unknown custom school level as an orphan instead of inventing a cycle', () => {
    const levels = mergeAllSchoolsClassLevels(
      [classWithLevel(33, 303, 777, 'CUSTOM-X', 'Custom Level')],
      [],
    );

    expect(levels).toEqual([
      expect.objectContaining({ id: 777, code: 'CUSTOM-X', name: 'Custom Level', cycle: null }),
    ]);
  });
});
