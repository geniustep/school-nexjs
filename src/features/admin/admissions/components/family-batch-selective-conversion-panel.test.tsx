// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { FamilyBatchApplicationSummary } from '@/types/admission';
import { FamilyBatchSelectiveConversionPanel } from '../components/family-batch-selective-conversion-panel';

const convertMock = vi.fn();
const onConverted = vi.fn();

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('../api/family-admissions-api', () => ({
  convertFamilyBatchApplicationsToStudents: (...args: unknown[]) => convertMock(...args),
}));

function child(
  overrides: Partial<FamilyBatchApplicationSummary> & { id: number; student_name: string },
): FamilyBatchApplicationSummary {
  return {
    state: 'confirmed',
    requested_level: { id: 1, name: 'الأولى' },
    ...overrides,
  };
}

const threeChildren: FamilyBatchApplicationSummary[] = [
  child({
    id: 101,
    student_name: 'أيمن العروي',
    name: 'ADM/101',
    application_status: 'ready_for_registration',
    modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
    primary_next_action: 'convert_to_student',
  }),
  child({
    id: 102,
    student_name: 'ليلى الوجدي',
    name: 'ADM/102',
    application_status: 'registered',
    student_id: 900,
  }),
  child({
    id: 103,
    student_name: 'سامي التازي',
    name: 'ADM/103',
    application_status: 'ready_for_registration',
    modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
    primary_next_action: 'convert_to_student',
  }),
];

function renderPanel(applications = threeChildren) {
  return render(
    <LocaleProvider>
      <FamilyBatchSelectiveConversionPanel
        batchId={55}
        applications={applications}
        onConverted={onConverted}
      />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'ar');
  convertMock.mockReset();
  onConverted.mockReset();
});

afterEach(() => cleanup());

describe('FamilyBatchSelectiveConversionPanel', () => {
  it('renders three children and blocks registered / allows eligible selection', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByTestId('family-batch-convert-row-101')).toBeTruthy();
    expect(screen.getByTestId('family-batch-convert-row-102')).toBeTruthy();
    expect(screen.getByTestId('family-batch-convert-row-103')).toBeTruthy();

    expect(screen.getByTestId('family-batch-convert-check-101')).toBeTruthy();
    expect(screen.queryByTestId('family-batch-convert-check-102')).toBeNull();
    expect(screen.getByTestId('family-batch-convert-check-103')).toBeTruthy();

    const submit = screen.getByTestId('family-batch-convert-submit');
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByTestId('family-batch-convert-check-101'));
    expect(screen.getByTestId('family-batch-convert-selected-count').textContent).toContain('1');
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    expect(submit.textContent).toContain('1');

    await user.click(screen.getByTestId('family-batch-convert-check-103'));
    expect(screen.getByTestId('family-batch-convert-selected-count').textContent).toContain('2');
  });

  it('select-all eligible selects only convertible children', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('family-batch-convert-select-all-eligible'));
    expect((screen.getByTestId('family-batch-convert-check-101') as HTMLInputElement).checked).toBe(
      true,
    );
    expect((screen.getByTestId('family-batch-convert-check-103') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.queryByTestId('family-batch-convert-check-102')).toBeNull();
    expect(screen.getByTestId('family-batch-convert-selected-count').textContent).toContain('2');
  });

  it('cancel on confirm does not mutate; confirm sends one request', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('family-batch-convert-check-101'));
    await user.click(screen.getByTestId('family-batch-convert-submit'));

    expect(screen.getByText('تأكيد التحويل إلى تلاميذ')).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('أيمن العروي')).toBeTruthy();
    expect(within(dialog).queryByText('ليلى الوجدي')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(convertMock).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('family-batch-convert-submit'));
    convertMock.mockResolvedValue({
      httpStatus: 200,
      response: {
        success: true,
        data: {
          batch_id: 55,
          status: 'completed',
          requested_count: 1,
          succeeded_count: 1,
          failed_count: 0,
          applications: [
            {
              application_id: 101,
              status: 'succeeded',
              student_id: 901,
              code: 'STUDENT_CREATED',
              message: 'created',
            },
          ],
        },
        meta: {},
      },
    });
    await user.click(screen.getByRole('button', { name: 'تأكيد التحويل' }));
    await waitFor(() => expect(convertMock).toHaveBeenCalledTimes(1));
    expect(convertMock.mock.calls[0][0]).toBe(55);
    expect(convertMock.mock.calls[0][1].application_ids).toEqual([101]);
    expect(typeof convertMock.mock.calls[0][1].idempotency_key).toBe('string');
    await waitFor(() => expect(onConverted).toHaveBeenCalled());
    expect(screen.getByTestId('family-batch-convert-result').getAttribute('data-outcome')).toBe(
      'completed',
    );
    expect(screen.getByTestId('family-batch-convert-result-student-101')).toBeTruthy();
  });

  it('prevents double submit and reuses idempotency key on uncertain retry', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('family-batch-convert-check-101'));
    await user.click(screen.getByTestId('family-batch-convert-submit'));

    let resolveConvert: ((value: unknown) => void) | undefined;
    convertMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConvert = resolve;
        }),
    );

    const confirmBtn = screen.getByRole('button', { name: 'تأكيد التحويل' });
    await user.click(confirmBtn);
    await user.click(confirmBtn);
    expect(convertMock).toHaveBeenCalledTimes(1);
    const firstKey = convertMock.mock.calls[0][1].idempotency_key as string;

    resolveConvert?.({
      httpStatus: 0,
      response: {
        success: false,
        error: {
          code: 'network_error',
          message: 'network',
          details: { status: 0 },
        },
        meta: {},
      },
    });

    await waitFor(() => expect(screen.getByTestId('family-batch-convert-retry')).toBeTruthy());
    convertMock.mockResolvedValue({
      httpStatus: 200,
      response: {
        success: true,
        data: {
          batch_id: 55,
          status: 'completed',
          requested_count: 1,
          succeeded_count: 1,
          failed_count: 0,
          applications: [
            { application_id: 101, status: 'succeeded', student_id: 901, code: 'STUDENT_CREATED' },
          ],
        },
        meta: {},
      },
    });
    await user.click(screen.getByTestId('family-batch-convert-retry'));
    await waitFor(() => expect(convertMock).toHaveBeenCalledTimes(2));
    expect(convertMock.mock.calls[1][1].idempotency_key).toBe(firstKey);
    expect(convertMock.mock.calls[1][1].application_ids).toEqual([101]);
  });

  it('shows independent per-child results on partial success without global success wording', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('family-batch-convert-select-all-eligible'));
    await user.click(screen.getByTestId('family-batch-convert-submit'));
    convertMock.mockResolvedValue({
      httpStatus: 200,
      response: {
        success: true,
        data: {
          batch_id: 55,
          status: 'partially_completed',
          requested_count: 2,
          succeeded_count: 1,
          failed_count: 1,
          already_registered_count: 0,
          applications: [
            { application_id: 101, status: 'succeeded', student_id: 901, code: 'STUDENT_CREATED' },
            {
              application_id: 103,
              status: 'failed',
              student_id: null,
              code: 'CONVERT_FAILED',
              message: 'تعذر',
            },
          ],
        },
        meta: {},
      },
    });
    await user.click(screen.getByRole('button', { name: 'تأكيد التحويل' }));
    await waitFor(() => expect(screen.getByTestId('family-batch-convert-result')).toBeTruthy());
    const result = screen.getByTestId('family-batch-convert-result');
    expect(result.getAttribute('data-outcome')).toBe('partially_completed');
    expect(result.textContent).toContain('اكتمل التحويل جزئيًا');
    expect(result.textContent).not.toMatch(/نجح تحويل جميع/);
    expect(screen.getByTestId('family-batch-convert-result-row-101').getAttribute('data-status')).toBe(
      'succeeded',
    );
    expect(screen.getByTestId('family-batch-convert-result-row-103').getAttribute('data-status')).toBe(
      'failed',
    );
    expect(screen.getByTestId('family-batch-convert-result-student-101')).toBeTruthy();
    expect(screen.queryByTestId('family-batch-convert-result-student-103')).toBeNull();
  });

  it('shows already_registered and replayed independently', async () => {
    const user = userEvent.setup();
    renderPanel([
      child({
        id: 201,
        student_name: 'نور',
        application_status: 'ready_for_registration',
        modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      }),
      child({
        id: 202,
        student_name: 'هدى',
        application_status: 'ready_for_registration',
        modern_allowed_actions: [{ code: 'convert_to_student', allowed: true }],
      }),
    ]);
    await user.click(screen.getByTestId('family-batch-convert-select-all-eligible'));
    await user.click(screen.getByTestId('family-batch-convert-submit'));
    convertMock.mockResolvedValue({
      httpStatus: 200,
      response: {
        success: true,
        data: {
          batch_id: 55,
          status: 'partially_completed',
          requested_count: 2,
          succeeded_count: 0,
          already_registered_count: 1,
          replayed_count: 1,
          failed_count: 0,
          applications: [
            { application_id: 201, status: 'already_registered', student_id: 11 },
            { application_id: 202, status: 'replayed', student_id: 12, replayed: true },
          ],
        },
        meta: {},
      },
    });
    await user.click(screen.getByRole('button', { name: 'تأكيد التحويل' }));
    await waitFor(() => expect(screen.getByTestId('family-batch-convert-result-row-201')).toBeTruthy());
    expect(screen.getByTestId('family-batch-convert-result-row-201').textContent).toContain(
      'مسجل سابقًا',
    );
    expect(screen.getByTestId('family-batch-convert-result-row-202').textContent).toContain(
      'نتيجة سابقة',
    );
  });

  it('shows idempotency conflict clearly and no-eligible state', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByTestId('family-batch-convert-check-101'));
    await user.click(screen.getByTestId('family-batch-convert-submit'));
    convertMock.mockResolvedValue({
      httpStatus: 409,
      response: {
        success: false,
        error: {
          code: 'idempotency_conflict',
          message: 'conflict',
          details: { status: 409 },
        },
        meta: {},
      },
    });
    await user.click(screen.getByRole('button', { name: 'تأكيد التحويل' }));
    await waitFor(() => expect(screen.getByTestId('family-batch-convert-error')).toBeTruthy());
    expect(screen.getByTestId('family-batch-convert-error').textContent).toContain('تعارض');

    cleanup();
    renderPanel([
      child({
        id: 1,
        student_name: 'مسجل',
        application_status: 'registered',
        student_id: 1,
      }),
    ]);
    expect(screen.getByTestId('family-batch-convert-no-eligible')).toBeTruthy();
    expect(screen.queryByTestId('family-batch-convert-submit')).toBeNull();
  });

  it('uses i18n labels rather than hardcoded English action text', () => {
    renderPanel();
    expect(screen.getByTestId('family-batch-convert-submit').textContent).toMatch(/تحويل/);
    expect(screen.getByText(/تحديد جميع المؤهلين/)).toBeTruthy();
  });

  it('keeps RTL document direction intact for the panel', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    renderPanel();
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(screen.getByTestId('family-batch-selective-conversion')).toBeTruthy();
  });
});
