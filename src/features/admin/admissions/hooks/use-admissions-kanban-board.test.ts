import { describe, expect, it } from 'vitest';
import { kanbanColumnsKey } from './use-admissions-kanban-board';

// Regression guard for the nibras request storm: the kanban board effect must
// key off `kanbanColumnsKey(columns)` (a stable string) rather than the
// `columns` array reference. Callers build a fresh array on every render
// (e.g. `[stateFilter]` or `[...ACTIVE, ...CLOSED]`), so depending on the array
// identity re-ran the effect — and re-fired one Odoo request per column — on
// every render, hammering /api/v1/admin/admissions (and /api/v1/me via the BFF).

describe('kanbanColumnsKey', () => {
  it('is stable across distinct array instances with equal content (no refetch loop)', () => {
    const renderA = ['new', 'contacted', 'qualified'];
    const renderB = ['new', 'contacted', 'qualified'];

    // The arrays are NOT reference-equal — this is exactly the situation that
    // previously re-triggered the effect every render.
    expect(Object.is(renderA, renderB)).toBe(false);

    // ...but the derived dependency key IS equal, so React skips re-running the
    // effect and the board does not re-fetch.
    expect(kanbanColumnsKey(renderA)).toBe(kanbanColumnsKey(renderB));
  });

  it('changes when the column set genuinely changes (a real refetch is allowed)', () => {
    expect(kanbanColumnsKey(['new'])).not.toBe(kanbanColumnsKey(['lost']));
    expect(kanbanColumnsKey(['new', 'contacted'])).not.toBe(kanbanColumnsKey(['new']));
  });

  it('produces a falsy key for an empty column set (effect short-circuits, no fetch)', () => {
    expect(kanbanColumnsKey([])).toBe('');
  });
});
