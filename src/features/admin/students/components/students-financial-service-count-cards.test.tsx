// @vitest-environment happy-dom

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import { StudentsFinancialServiceCountCards } from './students-financial-service-count-cards';
import type { StudentsFinancialServiceCountItem } from '../utils/students-financial-service-counts';

const canonicalItems: StudentsFinancialServiceCountItem[] = [
  {
    service_id: 1308,
    name: 'التسجيل',
    code: 'REGISTRATION',
    active: true,
    sequence: 10,
    student_count: 69,
  },
  {
    service_id: 1309,
    name: 'التمدرس',
    code: 'TUITION',
    active: true,
    sequence: 20,
    student_count: 61,
  },
  {
    service_id: 1310,
    name: 'النقل',
    code: 'TRANSPORT',
    active: true,
    sequence: 30,
    student_count: 44,
  },
  {
    service_id: 1311,
    name: 'المطعم',
    code: 'CANTEEN',
    active: true,
    sequence: 40,
    student_count: 4,
  },
  {
    service_id: 1312,
    name: 'الحضانة',
    code: 'DAYCARE',
    active: true,
    sequence: 50,
    student_count: 0,
  },
  {
    service_id: 1313,
    name: 'الكتب',
    code: 'BOOKS',
    active: true,
    sequence: 60,
    student_count: 0,
  },
  {
    service_id: 1314,
    name: 'الأنشطة',
    code: 'ACTIVITIES',
    active: true,
    sequence: 70,
    student_count: 0,
  },
  {
    service_id: 1315,
    name: 'التأمين',
    code: 'INSURANCE',
    active: true,
    sequence: 80,
    student_count: 0,
  },
  {
    service_id: 1316,
    name: 'الرحلات',
    code: 'TRIPS',
    active: true,
    sequence: 90,
    student_count: 0,
  },
  {
    service_id: 1317,
    name: 'أخرى',
    code: 'OTHER',
    active: true,
    sequence: 100,
    student_count: 0,
  },
];

const onSelectAll = vi.fn();
const onSelectService = vi.fn();
const onRetry = vi.fn();

function renderCards(
  props: Partial<ComponentProps<typeof StudentsFinancialServiceCountCards>> = {},
) {
  return render(
    <LocaleProvider>
      <StudentsFinancialServiceCountCards
        items={canonicalItems}
        totalStudents={123}
        initialLoading={false}
        error={null}
        serviceId=""
        servicePresence=""
        onSelectAll={onSelectAll}
        onSelectService={onSelectService}
        onRetry={onRetry}
        {...props}
      />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
  onSelectAll.mockReset();
  onSelectService.mockReset();
  onRetry.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('StudentsFinancialServiceCountCards', () => {
  it('defaults to all-students as the active card without service params', () => {
    renderCards();
    const all = screen.getByRole('button', { name: /كل التلاميذ/i });
    expect(all.getAttribute('aria-pressed')).toBe('true');
    expect(all.getAttribute('data-service-card')).toBe('all');
  });

  it('renders canonical services once with endpoint counts', () => {
    renderCards();
    expect(document.querySelectorAll('[data-service-id]')).toHaveLength(10);
    expect(document.querySelectorAll('[data-service-id="1310"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-service-code="REGISTRATION"]')).toHaveLength(1);
    expect(document.querySelectorAll('[data-service-code="TRANSPORT"]')).toHaveLength(1);
    expect(screen.getByText(/44/)).toBeTruthy();
    expect(screen.getByText(/69/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /عرض كل الخدمات/i })).toBeNull();
  });

  it('applies tone classes from service code mapping', () => {
    renderCards();
    const transport = document.querySelector('[data-service-id="1310"]');
    const registration = document.querySelector('[data-service-code="REGISTRATION"]');
    expect(transport?.className).toContain('students-service-counts__card--tone-blue');
    expect(registration?.className).toContain('students-service-counts__card--tone-violet');
  });

  it('clicks all-students card to clear service filter', async () => {
    const user = userEvent.setup();
    renderCards({ serviceId: '1310', servicePresence: 'has' });
    await user.click(screen.getByRole('button', { name: /كل التلاميذ/i }));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('clicks transport by service id contract', async () => {
    const user = userEvent.setup();
    renderCards();
    const transport = document.querySelector('[data-service-id="1310"]') as HTMLButtonElement;
    await user.click(transport);
    expect(onSelectService).toHaveBeenCalledWith('1310');
  });

  it('clarifies not_has without implying the count is non-beneficiaries', () => {
    renderCards({ serviceId: '1310', servicePresence: 'not_has' });
    const transport = document.querySelector('[data-service-id="1310"]') as HTMLElement;
    expect(transport.getAttribute('aria-pressed')).toBe('true');
    expect(within(transport).getByText(/لديهم هذه الخدمة/)).toBeTruthy();
    expect(screen.getByText(/عامل التصفية الحالي: لا يملك الخدمة/)).toBeTruthy();
  });

  it('shows zero-count services without hiding them', () => {
    renderCards();
    expect(document.querySelector('[data-service-code="BOOKS"]')).toBeTruthy();
  });

  it('expands when more than the initial visible count', async () => {
    const user = userEvent.setup();
    const many = [
      ...canonicalItems,
      {
        service_id: 9999,
        name: 'خدمة إضافية',
        code: 'EXTRA',
        active: true,
        sequence: 110,
        student_count: 1,
      },
    ];
    renderCards({ items: many });
    expect(document.querySelector('[data-service-id="9999"]')).toBeNull();
    await user.click(screen.getByRole('button', { name: /عرض كل الخدمات/i }));
    expect(document.querySelector('[data-service-id="9999"]')).toBeTruthy();
  });

  it('shows retry on error without blocking the list contract', () => {
    renderCards({ items: [], error: { message: 'fail' }, totalStudents: 0 });
    expect(screen.getByText(/تعذّر تحميل أعداد الخدمات/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /إعادة المحاولة/i })).toBeTruthy();
  });

  it('shows skeletons during initial load without fake zeros', () => {
    renderCards({ initialLoading: true, items: [], totalStudents: 0 });
    expect(screen.queryByText('كل التلاميذ')).toBeNull();
    expect(document.querySelectorAll('.students-service-counts__skeleton').length).toBeGreaterThan(0);
  });
});