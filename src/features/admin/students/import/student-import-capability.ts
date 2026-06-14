import type { CurrentUser } from '@/types/user';
import { STUDENT_IMPORT_CAPABILITY } from './student-import-server-types';

export function resolveEffectiveCapabilities(user: CurrentUser | null | undefined): string[] {
  if (!user) return [];
  if (Array.isArray(user.effective_capabilities) && user.effective_capabilities.length > 0) {
    return user.effective_capabilities;
  }
  return [];
}

export function hasStudentImportCapability(user: CurrentUser | null | undefined): boolean {
  return resolveEffectiveCapabilities(user).includes(STUDENT_IMPORT_CAPABILITY);
}
