// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { AnnualDistributionTimeline } from '@/types/teaching-planning';
import { DistributionTimeline } from './distribution-timeline';

vi.mock('../teaching-planning.css', () => ({}));

vi.mock('@/features/i18n/use-format', () => ({
  useFormat: () => ({
    formatDate: (value: string) => value,
    formatDateTime: (value: string) => value,
  }),
}));

function renderTimeline(timeline: AnnualDistributionTimeline) {
  return render(
    <LocaleProvider>
      <DistributionTimeline timeline={timeline} />
    </LocaleProvider>,
  );
}

describe('DistributionTimeline', () => {
  beforeEach(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  });

  afterEach(() => {
    cleanup();
  });

  it('distinguishes instructional items from calendar markers by icon, text and badge', () => {
    renderTimeline({
      instructional_items: [
        {
          kind: 'instructional_item',
          id: 1,
          order: 1,
          item_type: 'sequence',
          name: 'Unit plan A',
          sequence_id: null,
          period_label: null,
          session_count: 4,
          date_start: '2026-09-01',
          date_end: '2026-09-15',
        },
      ],
      calendar_markers: [
        {
          kind: 'calendar_marker',
          id: 9,
          marker_type: 'holiday',
          name: 'Autumn break',
          date_start: '2026-10-01',
          date_end: '2026-10-10',
          is_instructional_break: true,
        },
      ],
      combined_timeline: [
        {
          kind: 'instructional_item',
          id: 1,
          order: 1,
          item_type: 'sequence',
          name: 'Unit plan A',
          sequence_id: null,
          period_label: null,
          session_count: 4,
          date_start: '2026-09-01',
          date_end: '2026-09-15',
        },
        {
          kind: 'calendar_marker',
          id: 9,
          marker_type: 'holiday',
          name: 'Autumn break',
          date_start: '2026-10-01',
          date_end: '2026-10-10',
          is_instructional_break: true,
        },
      ],
    });

    expect(screen.getByText('Unit plan A')).toBeTruthy();
    expect(screen.getByText('Autumn break')).toBeTruthy();
    expect(screen.getAllByText('Instructional item').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Calendar marker').length).toBeGreaterThan(0);
    expect(screen.getAllByText('📘').length).toBeGreaterThan(0);
    expect(screen.getAllByText('📅').length).toBeGreaterThan(0);
  });

  it('shows empty state when timeline has no entries', () => {
    renderTimeline({
      instructional_items: [],
      calendar_markers: [],
      combined_timeline: [],
    });
    expect(screen.getByText('No timeline entries')).toBeTruthy();
  });
});
