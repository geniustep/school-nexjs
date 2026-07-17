import { canSeeChannels } from '@/lib/permissions/scope';
import type { CurrentUser } from '@/types/user';

/**
 * Whether the admin may open the student communication compose experience.
 * Does not mean a writable channel exists — only that the compose route is allowed.
 * No network fetch.
 */
export function canOpenStudentCommunication(user: CurrentUser | null): boolean {
  return canSeeChannels(user);
}
