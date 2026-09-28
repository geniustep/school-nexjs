import { describe, expect, it } from 'vitest';
import { endpoints } from '@/lib/api/endpoints';

describe('working week admin contract', () => {
 it('registers the governed endpoint', () => {
  expect(endpoints.admin.timetableWorkingWeek).toBe('/admin/timetable/working-week');
 });
 it('keeps the working-week route separate from operational timetable slots', () => {
  expect(endpoints.admin.timetableWorkingWeek).not.toBe(endpoints.admin.timetable);
 });
});
