import { describe, expect, it } from 'vitest';
import { formatAcademicYearSwitcherLabel } from './academic-year-display';

describe('academic year switcher display', () => {
  it('shows chronological years safely in Arabic and Latin labels', () => {
    expect(formatAcademicYearSwitcherLabel('السنة الدراسية 2027 - 2026')).toBe('السنة الدراسية \u20662026/2027\u2069');
    expect(formatAcademicYearSwitcherLabel('Année scolaire 2026-2027')).toBe('Année scolaire \u20662026/2027\u2069');
  });
  it('does not change unrelated labels', () => {
    expect(formatAcademicYearSwitcherLabel('2026')).toBe('2026');
    expect(formatAcademicYearSwitcherLabel('2026/2027')).toBe('\u20662026/2027\u2069');
    expect(formatAcademicYearSwitcherLabel('Année en cours')).toBe('Année en cours');
  });
});
