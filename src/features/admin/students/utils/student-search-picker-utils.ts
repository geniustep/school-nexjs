import type { StudentSearchHit } from '@/types/student-search';
import {
  isStudentSpotlightCloseKey,
  moveSpotlightActiveIndex,
} from './student-spotlight-utils';
import {
  normalizeStudentSearchQuery,
  shouldFetchStudentSearch,
  STUDENT_SEARCH_MIN_QUERY_LENGTH,
} from './student-search-query';

export type StudentSearchPickerViewState =
  | 'idle'
  | 'too-short'
  | 'loading'
  | 'results'
  | 'empty'
  | 'empty-with-suggestion'
  | 'error';

export function filterExcludedStudentSearchHits(
  results: StudentSearchHit[],
  excludeStudentIds?: number[],
): StudentSearchHit[] {
  if (!excludeStudentIds?.length) return results;
  const excluded = new Set(excludeStudentIds);
  return results.filter((hit) => !excluded.has(hit.id));
}

export function resolveStudentSearchPickerViewState(input: {
  query: string;
  loading: boolean;
  error: boolean;
  resultCount: number;
  suggestion: string | null;
  disabled?: boolean;
}): StudentSearchPickerViewState {
  if (input.disabled) return 'idle';
  const trimmed = normalizeStudentSearchQuery(input.query);
  if (!trimmed) return 'idle';
  if (!shouldFetchStudentSearch(trimmed)) return 'too-short';
  if (input.loading) return 'loading';
  if (input.error) return 'error';
  if (input.resultCount > 0) return 'results';
  if (input.suggestion) return 'empty-with-suggestion';
  return 'empty';
}

export function isStudentSearchPickerCloseKey(key: string): boolean {
  return isStudentSpotlightCloseKey(key);
}

export function moveStudentSearchPickerActiveIndex(
  currentIndex: number,
  resultCount: number,
  direction: 'up' | 'down',
): number {
  return moveSpotlightActiveIndex(currentIndex, resultCount, direction);
}

export type StudentSearchPickerKeyDownContext = {
  resultCount: number;
  activeIndex: number;
  listOpen: boolean;
};

export type StudentSearchPickerKeyDownResult =
  | { type: 'none' }
  | { type: 'move'; nextIndex: number }
  | { type: 'select'; index: number }
  | { type: 'close-list' };

export function handleStudentSearchPickerKeyDown(
  key: string,
  context: StudentSearchPickerKeyDownContext,
): StudentSearchPickerKeyDownResult {
  if (isStudentSearchPickerCloseKey(key)) {
    return context.listOpen ? { type: 'close-list' } : { type: 'none' };
  }

  if (!context.listOpen || context.resultCount <= 0) {
    return { type: 'none' };
  }

  if (key === 'ArrowDown') {
    return {
      type: 'move',
      nextIndex: moveStudentSearchPickerActiveIndex(
        context.activeIndex,
        context.resultCount,
        'down',
      ),
    };
  }

  if (key === 'ArrowUp') {
    return {
      type: 'move',
      nextIndex: moveStudentSearchPickerActiveIndex(
        context.activeIndex,
        context.resultCount,
        'up',
      ),
    };
  }

  if (key === 'Enter' && context.activeIndex >= 0) {
    return { type: 'select', index: context.activeIndex };
  }

  return { type: 'none' };
}

export { STUDENT_SEARCH_MIN_QUERY_LENGTH };
