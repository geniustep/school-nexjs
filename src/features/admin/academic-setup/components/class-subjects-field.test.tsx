/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ClassSubjectsField } from './class-subjects-field';

const t = (key: string, vars?: Record<string, string | number>) => {
  if (key === 'admin.academicSetup.classSubjectsSelectedOfTotal') {
    return `${vars?.selected} من ${vars?.total} محددة`;
  }
  if (key === 'admin.academicSetup.classSubjectsSelectAll') return 'تحديد الكل';
  if (key === 'admin.academicSetup.classSubjectsClearAll') return 'إلغاء الكل';
  if (key === 'common.loading') return 'جاري التحميل';
  if (key === 'common.retry') return 'إعادة المحاولة';
  return key;
};

const options = [
  { id: 1, name: 'الرياضيات', code: 'MATH', refSubjectId: 10 },
  { id: 2, name: 'العربية', code: 'AR', refSubjectId: 11 },
  { id: 3, name: 'الفرنسية', code: 'FR', refSubjectId: 12 },
];

describe('ClassSubjectsField bulk selection', () => {
  afterEach(() => cleanup());

  it('shows selected/total and supports select-all / clear-all / toggle', () => {
    const onToggle = vi.fn();
    const onSelectAll = vi.fn();
    const onClearAll = vi.fn();
    const { rerender } = render(
      <ClassSubjectsField
        t={t}
        loading={false}
        error={null}
        options={options}
        legacy={[]}
        selectedIds={[1, 2, 3]}
        onToggle={onToggle}
        onSelectAll={onSelectAll}
        onClearAll={onClearAll}
        onRetry={() => undefined}
      />,
    );

    expect(screen.getByText('3 من 3 محددة')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء الكل' }));
    expect(onClearAll).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'تحديد الكل' }));
    expect(onSelectAll).toHaveBeenCalledTimes(1);

    const math = screen.getByLabelText(/الرياضيات/);
    fireEvent.click(math);
    expect(onToggle).toHaveBeenCalledWith(1);

    rerender(
      <ClassSubjectsField
        t={t}
        loading={false}
        error={null}
        options={options}
        legacy={[]}
        selectedIds={[2, 3]}
        onToggle={onToggle}
        onSelectAll={onSelectAll}
        onClearAll={onClearAll}
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByText('2 من 3 محددة')).toBeTruthy();
  });

  it('keeps loading distinct from empty options', () => {
    const { rerender } = render(
      <ClassSubjectsField
        t={t}
        loading
        error={null}
        options={[]}
        legacy={[]}
        selectedIds={[]}
        onToggle={() => undefined}
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByText('جاري التحميل')).toBeTruthy();

    rerender(
      <ClassSubjectsField
        t={t}
        loading={false}
        error={null}
        options={[]}
        legacy={[]}
        selectedIds={[]}
        onToggle={() => undefined}
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByText('admin.academicSetup.noSubjectsForLevel')).toBeTruthy();
  });
});
