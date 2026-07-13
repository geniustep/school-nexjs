// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { AnnualDistributionDetail } from '@/types/teaching-planning';

vi.mock('../teaching-planning.css', () => ({}));

const toast = { success: vi.fn(), error: vi.fn() };
vi.mock('@/components/ui/toast', () => ({
  useToast: () => toast,
}));

const validateDistributionLinesBatch = vi.fn();
const applyDistributionLinesBatch = vi.fn();

vi.mock('../api/annual-distributions-api', () => ({
  validateDistributionLinesBatch: (...args: unknown[]) =>
    validateDistributionLinesBatch(...args),
  applyDistributionLinesBatch: (...args: unknown[]) => applyDistributionLinesBatch(...args),
}));

import { DistributionBatchWorkspace } from './distribution-batch-workspace';

function draftDistribution(
  overrides: Partial<AnnualDistributionDetail> = {},
): AnnualDistributionDetail {
  return {
    id: 11,
    name: 'Year plan',
    school: { id: 1, name: 'School' },
    academic_year: { id: 2, name: '2026/2027' },
    level: { id: 3, name: 'Level 6' },
    subject: { id: 4, name: 'Math' },
    teaching_language: null,
    track: null,
    offering: null,
    reference: null,
    period_label: null,
    date_start: null,
    date_end: null,
    state: 'draft',
    active: false,
    version_label: 'v1',
    supersedes_id: null,
    totals: { line_count: 0, sequence_count: 0, total_sessions: 0 },
    readiness: {
      has_lines: false,
      sequences_resolved: true,
      dates_valid: true,
      ready_for_approval: false,
      ready_for_activation: false,
      blockers: [],
    },
    notes: null,
    blockers: [],
    active_version: null,
    replacement_version: null,
    superseded_by_id: null,
    is_latest_version: true,
    lines: [],
    approved_by_id: null,
    approved_at: null,
    activated_by_id: null,
    activated_at: null,
    reset_reason: null,
    archived_by_id: null,
    archived_at: null,
    allowed_actions: { manage_lines: true, view: true },
    ...overrides,
  };
}

describe('DistributionBatchWorkspace', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
    validateDistributionLinesBatch.mockReset();
    applyDistributionLinesBatch.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps apply disabled until validation succeeds and supports append mode', async () => {
    const user = userEvent.setup();
    const onApplied = vi.fn();
    validateDistributionLinesBatch.mockResolvedValue({
      success: true,
      data: { valid: true, row_count: 1, errors: [], warnings: [] },
      meta: {},
    });
    applyDistributionLinesBatch.mockResolvedValue({
      success: true,
      data: { created: 1, updated: 0, skipped: 0, errors: [] },
      meta: {},
    });

    render(
      <LocaleProvider>
        <DistributionBatchWorkspace
          distribution={draftDistribution()}
          canManageLines
          onApplied={onApplied}
        />
      </LocaleProvider>,
    );

    const applyBtn = screen.getByRole('button', { name: /^Apply$/i });
    expect(applyBtn.hasAttribute('disabled')).toBe(true);

    await user.type(
      screen.getByRole('textbox'),
      'sequence\tUnit 1\tT1\t2026-09-01\t2026-09-10\t4',
    );
    await user.click(screen.getByRole('button', { name: /Parse rows/i }));
    await user.click(screen.getByRole('button', { name: /^Validate$/i }));

    await waitFor(() => {
      expect(validateDistributionLinesBatch).toHaveBeenCalled();
    });
    expect(validateDistributionLinesBatch.mock.calls[0][2]).toBe('append');

    await waitFor(() => {
      expect(applyBtn.hasAttribute('disabled')).toBe(false);
    });

    await user.click(applyBtn);
    await waitFor(() => {
      expect(applyDistributionLinesBatch).toHaveBeenCalled();
      expect(onApplied).toHaveBeenCalled();
    });
  });

  it('blocks batch UX when distribution is not draft', () => {
    render(
      <LocaleProvider>
        <DistributionBatchWorkspace
          distribution={draftDistribution({ state: 'active' })}
          canManageLines
          onApplied={vi.fn()}
        />
      </LocaleProvider>,
    );
    expect(screen.getByText('Batch unavailable')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
