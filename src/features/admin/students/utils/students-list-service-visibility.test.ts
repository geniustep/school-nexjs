import { describe, expect, it } from 'vitest';
import { STUDENTS_LIST_FEE_TYPE_OPTIONS_QUERY } from '../hooks/use-students-list-fee-type-options';
import {
  isStaleStudentsListServiceSelection,
  isStudentsListServiceOptionVisible,
} from './students-list-service-visibility';

describe('students list fee type options query', () => {
  it('requests active visible services for the students filter', () => {
    expect(STUDENTS_LIST_FEE_TYPE_OPTIONS_QUERY).toMatchObject({
      active: 1,
      student_filter_visible: 1,
    });
  });
});

describe('students list service visibility', () => {
  it('matches visible service ids without name heuristics', () => {
    expect(isStudentsListServiceOptionVisible('1310', [1308, 1310, 1311])).toBe(true);
    expect(isStudentsListServiceOptionVisible('2130', [1308, 1310])).toBe(false);
    expect(isStudentsListServiceOptionVisible('', [1310])).toBe(false);
  });

  it('treats hidden fee-type or missing count card as stale selection', () => {
    expect(
      isStaleStudentsListServiceSelection('1308', {
        feeTypesLoaded: true,
        feeTypeIds: [1310, 1311],
        countsLoaded: false,
        countServiceIds: [],
      }),
    ).toBe(true);

    expect(
      isStaleStudentsListServiceSelection('1310', {
        feeTypesLoaded: true,
        feeTypeIds: [1310, 1311],
        countsLoaded: true,
        countServiceIds: [1310, 1311],
      }),
    ).toBe(false);

    expect(
      isStaleStudentsListServiceSelection('1310', {
        feeTypesLoaded: true,
        feeTypeIds: [1310],
        countsLoaded: true,
        countServiceIds: [1311],
      }),
    ).toBe(true);
  });

  it('does not clear while visibility sources are still loading', () => {
    expect(
      isStaleStudentsListServiceSelection('1310', {
        feeTypesLoaded: false,
        feeTypeIds: [],
        countsLoaded: false,
        countServiceIds: [],
      }),
    ).toBe(false);
  });
});
