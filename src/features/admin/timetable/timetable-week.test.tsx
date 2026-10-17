// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
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

 describe('weekly table layout regression', () => {
  it.each(['rtl', 'ltr'])('keeps native table columns and one caption with global styles in %s', (direction) => {
    const style = document.createElement('style');
    style.textContent = readFileSync('src/app/globals.css', 'utf8') + '\n' + readFileSync('src/features/admin/timetable/timetable-workspace.css', 'utf8');
    document.head.append(style);
    document.documentElement.dir = direction;
    try {
      render(<TimetableWeek slots={[slot(1), slot(2, 'tuesday')]} t={(key) => key} />);
      const table = screen.getByRole('table');
      expect(getComputedStyle(table).display).toBe('table');
      expect(screen.getAllByText('timetableWorkspace.recurring')).toHaveLength(1);
      const columns = within(table).getAllByRole('columnheader');
      expect(table.querySelectorAll('col')).toHaveLength(columns.length);
      for (const row of table.querySelectorAll('tbody tr')) {
        expect(row.children.length).toBe(columns.length);
      }
    } finally {
      style.remove();
      document.documentElement.dir = '';
    }
  });
 });

describe('empty weekday columns', () => {
 it('renders only populated columns in Monday to Sunday order',()=>{
  render(<TimetableWeek slots={[slot(1,'sunday'),slot(2,'wednesday'),slot(3,'monday')]} t={(key)=>key}/>);
  expect(screen.getAllByRole('columnheader').map((e)=>e.textContent)).toEqual(['academic.time','days.monday','days.wednesday','days.sunday']);
 });
 it('does not drop incomplete entries while hiding empty columns',()=>{
  render(<TimetableWeek slots={[slot(1,'wednesday','bad')]} t={(key)=>key}/>);
  expect(screen.getAllByRole('columnheader')).toHaveLength(1);
  expect(screen.getByText('Subject 1')).toBeTruthy();
 });
});
