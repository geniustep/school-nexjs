import { describe, expect, it } from 'vitest';
import { formatTeacherRefList, TEACHERS_PAGE_SIZE } from '@/features/admin/teachers/utils/teachers-list-present';

describe('teachers-list-present', () => {
  it('uses page size 20 for API pagination', () => {
    expect(TEACHERS_PAGE_SIZE).toBe(20);
  });

  it('formatTeacherRefList joins names or returns fallback', () => {
    expect(formatTeacherRefList([], '—')).toBe('—');
    expect(formatTeacherRefList([{ id: 1, name: 'Math' }], '—')).toBe('Math');
    expect(
      formatTeacherRefList(
        [
          { id: 1, name: '6A' },
          { id: 2, name: '6B' },
        ],
        '—',
      ),
    ).toBe('6A, 6B');
  });
});
