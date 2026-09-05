/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/i18n/locale-context', () => ({
  useLocale: () => ({ locale: 'ar', dir: 'rtl', t: (key: string) => key, setLocale: vi.fn() }),
  useT: () => (key: string) => key,
}));

import { AgreementAmendmentRangeRail } from './agreement-amendment-range-rail';

const periods = [
  {
    id: 305,
    label: 'October 2026',
    periodKey: '2026-10',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    selectable: true,
  },
  {
    id: 306,
    label: 'November 2026',
    periodKey: '2026-11',
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    selectable: true,
  },
];

afterEach(() => cleanup());

describe('AgreementAmendmentRangeRail scope selector', () => {
  it('defaults to this month and later, then encodes single month as start=end', () => {
    const onStartSelect = vi.fn();
    const onEndSelect = vi.fn();
    render(
      <AgreementAmendmentRangeRail
        periods={periods}
        startPeriodId=""
        endPeriodId=""
        scopeSelectionEnabled
        onStartSelect={onStartSelect}
        onEndSelect={onEndSelect}
      />,
    );

    expect(screen.getByRole('radio', { name: 'هذا الشهر وما بعده' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'هذا الشهر فقط' }));
    fireEvent.click(screen.getByRole('button', { name: /October 2026/i }));

    expect(onStartSelect).toHaveBeenCalledWith('305');
    expect(onEndSelect).toHaveBeenCalledWith('305');
  });

  it('restores future scope by clearing a start=end single-month selection', async () => {
    const onStartSelect = vi.fn();
    const onEndSelect = vi.fn();
    render(
      <AgreementAmendmentRangeRail
        periods={periods}
        startPeriodId="305"
        endPeriodId="305"
        scopeSelectionEnabled
        onStartSelect={onStartSelect}
        onEndSelect={onEndSelect}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'هذا الشهر فقط' })).toBeChecked(),
    );
    fireEvent.click(screen.getByRole('radio', { name: 'هذا الشهر وما بعده' }));
    expect(onEndSelect).toHaveBeenCalledWith('');
  });

  it('does not expose the scope selector when the caller did not opt in', () => {
    render(
      <AgreementAmendmentRangeRail
        periods={periods}
        startPeriodId=""
        endPeriodId=""
        onStartSelect={vi.fn()}
        onEndSelect={vi.fn()}
      />,
    );
    expect(screen.queryByRole('radio', { name: 'هذا الشهر فقط' })).toBeNull();
  });
});
