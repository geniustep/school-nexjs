'use client';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type { StaffAttendanceHistoryRow, StaffAttendanceMonthlyDetail, StaffAttendanceMonthlyRow, StaffAttendanceTodayRow } from './types';

export type StaffAttendanceTodayQuery = ListParams & { search?:string; status?:'all'|'present'|'no_record'|'present_complete'|'single_morning_record'|'single_record'|'insufficient_interval'; local_date?:string; relationship_category?:string; };
export type StaffAttendanceHistoryQuery = ListParams & { staff_relationship_id?:number; date_from?:string; date_to?:string; source_device_id?:number; };
export type StaffAttendanceMonthlyQuery = ListParams & { month:number; year:number; search?:string; relationship_category?:string; };

export const fetchStaffAttendanceToday=(query:StaffAttendanceTodayQuery={}):Promise<ApiResponse<StaffAttendanceTodayRow[]>>=>api.get(endpoints.admin.staffAttendanceToday,query);
export const fetchStaffAttendanceHistory=(query:StaffAttendanceHistoryQuery={}):Promise<ApiResponse<StaffAttendanceHistoryRow[]>>=>api.get(endpoints.admin.staffAttendanceHistory,query);
export const fetchStaffAttendanceMonthly=(query:StaffAttendanceMonthlyQuery):Promise<ApiResponse<StaffAttendanceMonthlyRow[]>>=>api.get(endpoints.admin.staffAttendanceMonthly,query);
export const fetchStaffAttendanceMonthlyDetail=(staff_relationship_id:number,month:number,year:number):Promise<ApiResponse<StaffAttendanceMonthlyDetail>>=>api.get(endpoints.admin.staffAttendanceMonthlyDetail,{staff_relationship_id,month,year});
