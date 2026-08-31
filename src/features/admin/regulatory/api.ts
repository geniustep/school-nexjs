import { api } from '@/lib/api/client';
import type { ApiResponse } from '@/types/api';
import type {
  RegulatoryProjectionResult,
  RegulatoryReferenceOverview,
  RegulatorySettings,
} from './types';

const REGULATORY_OVERVIEW_ENDPOINT = '/admin/regulatory-calendar/overview';
const REGULATORY_PROJECT_ENDPOINT = '/admin/regulatory-calendar/project';
const REGULATORY_SETTINGS_ENDPOINT = '/admin/regulatory-calendar/settings';

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

export function fetchRegulatorySettings(): Promise<ApiResponse<RegulatorySettings>> {
  return api.get<RegulatorySettings>(REGULATORY_SETTINGS_ENDPOINT);
}

export function updateRegulatorySettings(
  updatesEnabled: boolean,
): Promise<ApiResponse<RegulatorySettings>> {
  return api.post<RegulatorySettings>(REGULATORY_SETTINGS_ENDPOINT, {
    updates_enabled: updatesEnabled,
  });
}
