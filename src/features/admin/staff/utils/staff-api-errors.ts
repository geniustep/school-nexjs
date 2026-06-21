import { mapAcademicSetupApiError } from '@/features/admin/academic-setup/utils/api-errors';
import type { ApiErrorBody } from '@/types/api';

export function mapStaffCenterApiError(error: ApiErrorBody, t: (key: string) => string): string {
  return mapAcademicSetupApiError(error, t, 'staff');
}
