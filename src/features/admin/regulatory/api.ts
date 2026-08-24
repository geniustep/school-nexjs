import { api } from '@/lib/api/client';
import type { ApiResponse } from '@/types/api';
import type { RegulatoryProjectionResult, RegulatoryReferenceOverview } from './types';

const REGULATORY_OVERVIEW_ENDPOINT = '/admin/regulatory-calendar/overview';
const REGULATORY_PROJECT_ENDPOINT = '/admin/regulatory-calendar/project';

export function fetchRegulatoryReferenceOverview(
  academicYearId: number,
): Promise<ApiResponse<RegulatoryReferenceOverview>> {
  return api.get<RegulatoryReferenceOverview>(REGULATORY_OVERVIEW_ENDPOINT, {
    academic_year_id: academicYearId,
    days: 366,
  });
}

export function projectRegulatoryReferenceToCalendar(
  academicYearId: number,
): Promise<ApiResponse<RegulatoryProjectionResult>> {
  return api.post<RegulatoryProjectionResult>(REGULATORY_PROJECT_ENDPOINT, {
    academic_year_id: academicYearId,
  });
}
