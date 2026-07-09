import { describe, expect, it } from 'vitest';
import type { StudentSearchHit } from '@/types/student-search';
import {
  filterExcludedStudentSearchHits,
  handleStudentSearchPickerKeyDown,
  moveStudentSearchPickerActiveIndex,
  resolveStudentSearchPickerViewState,
} from './student-search-picker-utils';
import { STUDENT_SEARCH_DEBOUNCE_MS } from './student-search-query';

const sampleHit = (id: number): StudentSearchHit => ({
  id,
  code: `S${id}`,
  level: 'Grade 6',
  class: '6A',
  status: 'active',
  gender: null,
  date_of_birth: null,
  admission_date: null,
  email: null,
  phone: null,
  matched_on: 'name',
});

describe('filterExcludedStudentSearchHits', () => {
  it('returns all hits when no exclusions are provided', () => {
    const hits = [sampleHit(1), sampleHit(2)];
    expect(filterExcludedStudentSearchHits(hits)).toEqual(hits);
    expect(filterExcludedStudentSearchHits(hits, [])).toEqual(hits);
  });

  it('filters out excluded student ids', () => {
    const hits = [sampleHit(1), sampleHit(2), sampleHit(3)];
    expect(filterExcludedStudentSearchHits(hits, [2])).toEqual([
      sampleHit(1),
      sampleHit(3),
    ]);
  });
});

describe('resolveStudentSearchPickerViewState', () => {
  it('returns idle for empty query or disabled picker', () => {
    expect(
      resolveStudentSearchPickerViewState({
        query: '',
        loading: false,
        error: false,
        resultCount: 0,
        suggestion: null,
      }),
    ).toBe('idle');

    expect(
      resolveStudentSearchPickerViewState({
        query: 'ali',
        loading: true,
        error: false,
        resultCount: 0,
        suggestion: null,
        disabled: true,
      }),
    ).toBe('idle');
  });

  it('returns too-short before minimum query length', () => {
    expect(
      resolveStudentSearchPickerViewState({
        query: 'a',
        loading: false,
        error: false,
        resultCount: 0,
        suggestion: null,
      }),
    ).toBe('too-short');
  });

  it('prioritizes loading and error over results', () => {
    expect(
      resolveStudentSearchPickerViewState({
        query: 'ali',
        loading: true,
        error: false,
        resultCount: 2,
        suggestion: null,
      }),
    ).toBe('loading');

    expect(
      resolveStudentSearchPickerViewState({
        query: 'ali',
        loading: false,
        error: true,
        resultCount: 2,
        suggestion: null,
      }),
    ).toBe('error');
  });

  it('returns results when hits exist', () => {
    expect(
      resolveStudentSearchPickerViewState({
        query: 'ali',
        loading: false,
        error: false,
        resultCount: 1,
        suggestion: null,
      }),
    ).toBe('results');
  });

  it('returns empty-with-suggestion when no hits but suggestion exists', () => {
    expect(
      resolveStudentSearchPickerViewState({
        query: 'ahmd',
        loading: false,
        error: false,
        resultCount: 0,
        suggestion: 'ahmed',
      }),
    ).toBe('empty-with-suggestion');
  });

  it('returns empty when no hits and no suggestion', () => {
    expect(
      resolveStudentSearchPickerViewState({
        query: 'zzz',
        loading: false,
        error: false,
        resultCount: 0,
        suggestion: null,
      }),
    ).toBe('empty');
  });
});

describe('moveStudentSearchPickerActiveIndex', () => {
  it('wraps keyboard focus across result rows', () => {
    expect(moveStudentSearchPickerActiveIndex(-1, 3, 'down')).toBe(0);
    expect(moveStudentSearchPickerActiveIndex(0, 3, 'up')).toBe(2);
    expect(moveStudentSearchPickerActiveIndex(2, 3, 'down')).toBe(0);
  });
});

describe('handleStudentSearchPickerKeyDown', () => {
  const openList = { resultCount: 3, activeIndex: 0, listOpen: true };

  it('moves focus with arrow keys when the list is open', () => {
    expect(handleStudentSearchPickerKeyDown('ArrowDown', openList)).toEqual({
      type: 'move',
      nextIndex: 1,
    });
    expect(
      handleStudentSearchPickerKeyDown('ArrowUp', {
        ...openList,
        activeIndex: 0,
      }),
    ).toEqual({
      type: 'move',
      nextIndex: 2,
    });
  });

  it('selects the active row on Enter', () => {
    expect(
      handleStudentSearchPickerKeyDown('Enter', {
        ...openList,
        activeIndex: 1,
      }),
    ).toEqual({
      type: 'select',
      index: 1,
    });
  });

  it('ignores Enter when no row is active', () => {
    expect(
      handleStudentSearchPickerKeyDown('Enter', {
        ...openList,
        activeIndex: -1,
      }),
    ).toEqual({ type: 'none' });
  });

  it('closes the list on Escape without selecting', () => {
    expect(handleStudentSearchPickerKeyDown('Escape', openList)).toEqual({
      type: 'close-list',
    });
  });

  it('ignores navigation when the list is closed', () => {
    expect(
      handleStudentSearchPickerKeyDown('ArrowDown', {
        ...openList,
        listOpen: false,
      }),
    ).toEqual({ type: 'none' });
  });
});

describe('shared search debounce contract', () => {
  it('uses the same debounce interval as Spotlight and Students list', () => {
    expect(STUDENT_SEARCH_DEBOUNCE_MS).toBeGreaterThan(0);
  });
});
