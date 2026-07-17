// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StudentSearchHit } from '@/types/student-search';
import { StudentSpotlightResultRow } from './student-spotlight-result-row';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    if (key === 'admin.spotlight.openProfileNamed') return `open:${params?.name}`;
    if (key === 'admin.spotlight.studentType') return 'تلميذ';
    if (key === 'admin.spotlight.actions.openProfile') return 'فتح الملف';
    if (key === 'admin.spotlight.actions.payment') return 'الأداء';
    if (key === 'admin.spotlight.actions.message') return 'رسالة';
    return key;
  },
}));

function hit(partial: Partial<StudentSearchHit> & Pick<StudentSearchHit, 'id'>): StudentSearchHit {
  return {
    code: 'STU-00124',
    level: { id: 1, name: 'CM1' },
    class: { id: 2, name: 'P4A' },
    status: 'active',
    gender: null,
    date_of_birth: null,
    admission_date: null,
    email: null,
    phone: null,
    name_ar: 'أحمد مصطفى',
    name_latin: 'Ahmed Mostafa',
    matched_on: 'name',
    ...partial,
  };
}

afterEach(() => {
  cleanup();
});

describe('StudentSpotlightResultRow', () => {
  it('renders three-line identity without matched_on badge and without nested buttons', async () => {
    const onActivate = vi.fn();
    const onOpenPayment = vi.fn();
    const onOpenMessage = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <StudentSpotlightResultRow
        student={hit({ id: 2081, matched_on: 'name' })}
        active
        showProfile
        showPayment
        showMessage
        onActivate={onActivate}
        onHover={() => undefined}
        onOpenProfile={onActivate}
        onOpenPayment={onOpenPayment}
        onOpenMessage={onOpenMessage}
      />,
    );

    expect(screen.getByText('تلميذ')).toBeTruthy();
    expect(screen.getByText('أحمد مصطفى')).toBeTruthy();
    expect(screen.getByText('Ahmed Mostafa')).toBeTruthy();
    expect(screen.getByText('CM1 · P4A · STU-00124')).toBeTruthy();
    expect(screen.queryByText('الاسم')).toBeNull();
    expect(screen.queryByText('admin.spotlight.matchedOn.name')).toBeNull();
    expect(container.querySelectorAll('button button').length).toBe(0);

    await user.click(screen.getByRole('button', { name: 'الأداء' }));
    expect(onOpenPayment).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'رسالة' }));
    expect(onOpenMessage).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('omits latin dash and hides actions by capability', () => {
    render(
      <StudentSpotlightResultRow
        student={hit({ id: 1, name_latin: null })}
        active={false}
        showProfile
        showPayment={false}
        showMessage={false}
        onActivate={() => undefined}
        onHover={() => undefined}
        onOpenProfile={() => undefined}
        onOpenPayment={() => undefined}
        onOpenMessage={() => undefined}
      />,
    );

    expect(screen.getByText('أحمد مصطفى')).toBeTruthy();
    expect(screen.queryByText('—')).toBeNull();
    expect(screen.queryByRole('button', { name: 'الأداء' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'رسالة' })).toBeNull();
    expect(screen.getByRole('button', { name: 'فتح الملف' })).toBeTruthy();
  });
});
