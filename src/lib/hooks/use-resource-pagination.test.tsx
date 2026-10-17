// @vitest-environment happy-dom
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimetableWeek } from '@/features/admin/timetable/timetable-week';
import type { TimetableSlot } from '@/types/timetable';
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { get } }));
import { useResource } from './use-resource';
const slot = (id: number): TimetableSlot => ({ id, day: id < 50 ? 'monday' : 'wednesday', start_time: '08:30', end_time: '09:25', subject: { id, name: `Subject ${id}` } });
const rows = Array.from({ length: 106 }, (_, i) => slot(i + 1));
const pageResult = (page: number) => ({ success: true, data: rows.slice((page - 1) * 100, page * 100), meta: { pagination: { page, page_size: 100, total: rows.length, total_pages: 2 } } });
const options = { allPages: true, keepPreviousData: false };
afterEach(cleanup);
beforeEach(() => { get.mockReset(); });
describe('complete timetable pagination', () => {
 it('loads all pages with the same school/year scope before rendering late Wednesday sessions', async () => {
  get.mockImplementation((_path, query) => Promise.resolve(pageResult(query.page)));
  const query = { active_school_id: 1, academic_year_id: 2 };
  const { result } = renderHook(() => useResource<TimetableSlot[]>('/admin/timetable', query, options));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toHaveLength(106);
  expect(get).toHaveBeenNthCalledWith(2, '/admin/timetable', { ...query, page: 2, limit: 100 });
  render(<TimetableWeek slots={result.current.data!} t={key => key} />);
  expect(screen.getByText('Subject 106')).toBeTruthy();
  expect(result.current.data?.filter(row => row.day === 'wednesday')).toHaveLength(57);
 });
 it('does not expose the first page while the next page is pending', async () => {
  let finish!: (value: ReturnType<typeof pageResult>) => void;
  get.mockImplementation((_path, query) => query.page === 1 ? Promise.resolve(pageResult(1)) : new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(() => useResource('/admin/timetable', undefined, options));
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  expect(result.current.data).toBeNull();
  expect(result.current.loading).toBe(true);
  await act(async () => { finish(pageResult(2)); });
  expect(result.current.data).toHaveLength(106);
 });
 it.each(['denied', 'transport', 'changed', 'empty'])('shows an error instead of a partial timetable when page two is %s', async failure => {
  get.mockImplementation((_path, query) => {
   if (query.page === 1) return Promise.resolve(pageResult(1));
   if (failure === 'transport') return Promise.reject(new Error('offline'));
   if (failure === 'denied') return Promise.resolve({ success: false, error: { code: 'forbidden', message: 'Denied' }, meta: {} });
   const next = pageResult(2);
   if (failure === 'changed') next.meta.pagination.total++;
   if (failure === 'empty') next.data = [];
   return Promise.resolve(next);
  });
  const { result } = renderHook(() => useResource('/admin/timetable', undefined, options));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toBeNull();
  expect(result.current.error).toBeTruthy();
 });
 it('discards in-flight pages from a previous academic year', async () => {
  let finish!: (value: ReturnType<typeof pageResult>) => void;
  get.mockImplementation((_path, query) => query.academic_year_id === 2
   ? Promise.resolve({ success: true, data: [slot(999)], meta: { pagination: { page: 1, page_size: 100, total: 1, total_pages: 1 } } })
   : query.page === 1 ? Promise.resolve(pageResult(1)) : new Promise(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(({ year }) => useResource<TimetableSlot[]>('/admin/timetable', { academic_year_id: year }, options), { initialProps: { year: 1 } });
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
  rerender({ year: 2 });
  await waitFor(() => expect(result.current.data?.[0]?.id).toBe(999));
  await act(async () => { finish(pageResult(2)); });
  expect(result.current.data?.map(row => row.id)).toEqual([999]);
 });
 it('reloads the entire timetable after a mutation', async () => {
  get.mockImplementation((_path, query) => Promise.resolve(pageResult(query.page)));
  const { result } = renderHook(() => useResource('/admin/timetable', undefined, options));
  await waitFor(() => expect(result.current.data).toHaveLength(106));
  act(() => result.current.reload());
  await waitFor(() => expect(get).toHaveBeenCalledTimes(4));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toHaveLength(106);
 });
 it('keeps ordinary list requests paginated unless explicitly opted in', async () => {
  get.mockResolvedValue(pageResult(1));
  const { result } = renderHook(() => useResource('/admin/other', { page: 3 }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(get).toHaveBeenCalledExactlyOnceWith('/admin/other', { page: 3 });
  expect(result.current.data).toHaveLength(100);
 });
});
