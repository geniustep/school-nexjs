// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { InstallmentsListPanel, type InstallmentsListFilters } from './installments-list-panel';

const resourceSpy = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/finance/use-finance-lookups', () => ({
  useAcademicYearOptions: () => ({ options: [] }),
}));

vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: (endpoint: string, query: Record<string, unknown>) => {
    resourceSpy(endpoint, query);
    if (endpoint.endsWith('/finance/installments')) {
      return {
        data: {
          items: [],
          summary: { total_count: 24 },
          service_facets: [],
          timeline: [],
          attention: {},
        },
        meta: { pagination: { page: 1, page_size: 20, total: 24, total_pages: 2 } },
        initialLoading: false,
        fetching: false,
        error: null,
      };
    }
    return {
      data: [],
      meta: null,
      initialLoading: false,
      fetching: false,
      error: null,
    };
  },
}));

const filters: InstallmentsListFilters = {
  quick: '',
  search: '',
  academicYearId: '',
  classId: '',
  levelId: '',
  studentId: '',
  billingPartnerId: '',
  serviceId: '',
  dueDateFrom: '',
  dueDateTo: '',
  page: 1,
};

afterEach(() => {
  cleanup();
  resourceSpy.mockClear();
});

describe('InstallmentsListPanel', () => {
  it('keeps the installment list collapsed by default and opens it on demand', async () => {
    render(
      <LocaleProvider>
        <InstallmentsListPanel filters={filters} onFiltersChange={vi.fn()} />
      </LocaleProvider>,
    );

    const toggle = screen.getByRole('button', { name: /قائمة الأقساط/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('#installments-work-queue-results')).toBeNull();

    await userEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('#installments-work-queue-results')).toBeTruthy();
  });

  it('uses the legacy single-service contract and the additive multi-service contract', () => {
    const { rerender } = render(
      <LocaleProvider>
        <InstallmentsListPanel filters={{ ...filters, serviceId: '1' }} onFiltersChange={vi.fn()} />
      </LocaleProvider>,
    );

    expect(resourceSpy).toHaveBeenCalledWith(
      expect.stringContaining('/finance/installments'),
      expect.objectContaining({ service_id: 1, service_ids: undefined }),
    );

    resourceSpy.mockClear();
    rerender(
      <LocaleProvider>
        <InstallmentsListPanel filters={{ ...filters, serviceId: '1,2' }} onFiltersChange={vi.fn()} />
      </LocaleProvider>,
    );

    expect(resourceSpy).toHaveBeenCalledWith(
      expect.stringContaining('/finance/installments'),
      expect.objectContaining({ service_id: undefined, service_ids: '1,2' }),
    );
  });
});
