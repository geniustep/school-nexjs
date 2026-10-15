// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { groupWeek, TimetableWeek } from './timetable-week';
import type { TimetableSlot } from '@/types/timetable';
const slot = (id: number, day = 'monday', start_time = '09:00', end_time = '09:45'): TimetableSlot => ({ id, day, start_time, end_time, subject: { id: 1, name: `Subject ${id}` }, teacher: { id: 1, name: 'Teacher' }, class: { id: 1, name: 'TC-1' } });
afterEach(cleanup);
describe('weekly timetable presentation', () => {
  it('retains simultaneous sessions and Sunday without inferring conflicts', () => {
    render(<TimetableWeek slots={[slot(1), slot(2), slot(3, 'sunday')]} t={(key) => key} />);
    expect(screen.getByText('days.sunday')).toBeTruthy();
    const first = screen.getByText('Subject 1').closest('td')!;
    expect(within(first).getByText('Subject 2')).toBeTruthy();
    expect(screen.getByText('Subject 3')).toBeTruthy();
  });
  it('preserves malformed/missing day or time records in the fallback section', () => {
    const rows = [slot(1, 'other'), slot(2, 'monday', '25:00'), slot(3, 'monday', '10:00', '09:00'), slot(4)];
    const grouped = groupWeek(rows);
    expect(grouped.valid.map((s) => s.id)).toEqual([4]);
    expect(grouped.incomplete.map((s) => s.id)).toEqual([1, 2, 3]);
    render(<TimetableWeek slots={rows} t={(key) => key} />);
    rows.forEach((s) => expect(screen.getByText(`Subject ${s.id}`)).toBeTruthy());
  });
  it('normalizes seconds and sorts time ranges chronologically', () => {
    const grouped = groupWeek([slot(1, 'monday', '10:00:00', '10:45:00'), slot(2)]);
    expect(grouped.ranges).toEqual(['09:00–09:45', '10:00–10:45']);
  });
});
