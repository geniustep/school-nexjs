import { describe, expect, it } from 'vitest';
import type { LevelCycleOption, ReferenceLevelOption } from '@/types/academic-levels';
import type { StudentLevelOption } from '@/types/student-360';
import {
  buildEnrollmentCycleOptions,
  filterLevelsByCycleId,
  inferCycleCodeFromLevelCode,
  levelBelongsToCycle,
  resolveStudentLevelCycleId,
} from './student-enrollment-cycle';

const cycles: LevelCycleOption[] = [
  { id: 1, code: 'preschool', name: 'الأولي', sequence: 1 },
  { id: 2, code: 'primary', name: 'الابتدائي', sequence: 2 },
  { id: 3, code: 'middle_school', name: 'الإعدادي', sequence: 3 },
  { id: 4, code: 'high_school', name: 'الثانوي', sequence: 4 },
];

const referenceLevels: ReferenceLevelOption[] = [
  {
    id: 10,
    code: 'P6',
    name: 'P6',
    sequence: 6,
    active: true,
    supports_tracks: false,
    enabled: true,
    can_enable: true,
    cycle: cycles[1],
    reference_tracks: [],
    link_status: 'enabled',
  },
  {
    id: 11,
    code: 'M1',
    name: 'M1',
    sequence: 1,
    active: true,
    supports_tracks: false,
    enabled: true,
    can_enable: true,
    cycle: cycles[2],
    reference_tracks: [],
    link_status: 'enabled',
  },
];

const schoolLevels: StudentLevelOption[] = [
  { id: 2446, name: 'P6', code: 'P6', display_alias: 'P6' },
  { id: 77, name: 'M1', code: 'M1', display_alias: 'M1' },
  { id: 99, name: 'PRE1', code: 'PRE1', display_alias: 'PRE1' },
];

describe('inferCycleCodeFromLevelCode', () => {
  it('maps reference level codes', () => {
    expect(inferCycleCodeFromLevelCode('P6')).toBe('primary');
    expect(inferCycleCodeFromLevelCode('M1')).toBe('middle_school');
    expect(inferCycleCodeFromLevelCode('PRE1')).toBe('preschool');
    expect(inferCycleCodeFromLevelCode('H_TC')).toBe('high_school');
  });

  it('maps nibras / MEN school codes without broad prefix mistakes', () => {
    expect(inferCycleCodeFromLevelCode('PS')).toBe('preschool');
    expect(inferCycleCodeFromLevelCode('MS')).toBe('preschool');
    expect(inferCycleCodeFromLevelCode('GS')).toBe('preschool');
    expect(inferCycleCodeFromLevelCode('1AEP')).toBe('primary');
    expect(inferCycleCodeFromLevelCode('6AEP')).toBe('primary');
    expect(inferCycleCodeFromLevelCode('1ASC')).toBe('middle_school');
    expect(inferCycleCodeFromLevelCode('3ASC')).toBe('middle_school');
    expect(inferCycleCodeFromLevelCode('TC')).toBe('high_school');
    expect(inferCycleCodeFromLevelCode('1BAC')).toBe('high_school');
    expect(inferCycleCodeFromLevelCode('2BAC')).toBe('high_school');
  });

  it('does not classify PS as primary or MS as middle_school', () => {
    expect(inferCycleCodeFromLevelCode('PS')).not.toBe('primary');
    expect(inferCycleCodeFromLevelCode('MS')).not.toBe('middle_school');
  });
});

const nibrasSchoolLevels: StudentLevelOption[] = [
  { id: 1, name: 'الأولي 1', code: 'PS', display_alias: 'PS — الأولي 1' },
  { id: 2, name: 'الأولي 2', code: 'MS', display_alias: 'MS — الأولي 2' },
  { id: 3, name: 'الأولي 3', code: 'GS', display_alias: 'GS — الأولي 3' },
  { id: 4, name: 'الأولى ابتدائي', code: '1AEP', display_alias: '1AEP — الأولى ابتدائي' },
  { id: 10, name: 'الأولى إعدادي', code: '1ASC', display_alias: '1ASC — الأولى إعدادي' },
];

describe('filterLevelsByCycleId', () => {
  it('keeps only levels in the selected cycle', () => {
    const primaryLevels = filterLevelsByCycleId(schoolLevels, '2', referenceLevels, cycles);
    expect(primaryLevels.map((level) => level.code)).toEqual(['P6']);

    const middleLevels = filterLevelsByCycleId(schoolLevels, '3', referenceLevels, cycles);
    expect(middleLevels.map((level) => level.code)).toEqual(['M1']);
  });

  it('filters nibras codes by cycle without mixing PS into primary', () => {
    const preschoolLevels = filterLevelsByCycleId(nibrasSchoolLevels, '1', [], cycles);
    expect(preschoolLevels.map((level) => level.code)).toEqual(['PS', 'MS', 'GS']);

    const primaryLevels = filterLevelsByCycleId(nibrasSchoolLevels, '2', [], cycles);
    expect(primaryLevels.map((level) => level.code)).toEqual(['1AEP']);
    expect(primaryLevels.some((level) => level.code === 'PS')).toBe(false);

    const middleLevels = filterLevelsByCycleId(nibrasSchoolLevels, '3', [], cycles);
    expect(middleLevels.map((level) => level.code)).toEqual(['1ASC']);
    expect(middleLevels.some((level) => level.code === 'MS')).toBe(false);
  });

  it('returns empty list when cycle is not selected', () => {
    expect(filterLevelsByCycleId(schoolLevels, '', referenceLevels, cycles)).toEqual([]);
  });
});

describe('buildEnrollmentCycleOptions', () => {
  it('lists only cycles that have school levels', () => {
    const options = buildEnrollmentCycleOptions(schoolLevels, referenceLevels, cycles);
    expect(options.map((cycle) => cycle.code)).toEqual(['preschool', 'primary', 'middle_school']);
  });
});

describe('levelBelongsToCycle', () => {
  it('validates level against cycle', () => {
    expect(levelBelongsToCycle('2446', '2', schoolLevels, referenceLevels, cycles)).toBe(true);
    expect(levelBelongsToCycle('2446', '3', schoolLevels, referenceLevels, cycles)).toBe(false);
  });
});

describe('resolveStudentLevelCycleId', () => {
  it('uses reference level cycle when code matches', () => {
    const cycleByCode = new Map([['P6', cycles[1]]]);
    expect(resolveStudentLevelCycleId(schoolLevels[0], cycleByCode, cycles)).toBe(2);
  });
});
