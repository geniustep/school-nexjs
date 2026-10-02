'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type { StaffAttendanceHistoryRow, StaffAttendanceTodayRow } from './types';

export type StaffAttendanceTodayQuery = ListParams & {
  search?: string;
  status?: 'all' | 'present' | 'no_record';
};

export type StaffAttendanceHistoryQuery = ListParams & {
  staff_relationship_id?: number;
  date_from?: string;
  date_to?: string;
  source_device_id?: number;
};

export const fetchStaffAttendanceToday = (
  query: StaffAttendanceTodayQuery = {},
): Promise<ApiResponse<StaffAttendanceTodayRow[]>> =>
  api.get<StaffAttendanceTodayRow[]>(endpoints.admin.staffAttendanceToday, query);

export const fetchStaffAttendanceHistory = (
  query: StaffAttendanceHistoryQuery = {},
): Promise<ApiResponse<StaffAttendanceHistoryRow[]>> =>
  api.get<StaffAttendanceHistoryRow[]>(endpoints.admin.staffAttendanceHistory, query);
