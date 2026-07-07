import type { Gender } from '@/types/student';

export const STUDENT_PHOTO_PLACEHOLDER_PATHS = {
  male: '/images/students/student-boy-placeholder.svg',
  female: '/images/students/student-girl-placeholder.svg',
  neutral: '/images/students/student-neutral-placeholder.svg',
} as const;

/** Map API gender values to a local placeholder asset. Never infer from name. */
export function resolveStudentGenderPlaceholder(gender: Gender | string | null | undefined): string {
  if (gender === 'male') return STUDENT_PHOTO_PLACEHOLDER_PATHS.male;
  if (gender === 'female') return STUDENT_PHOTO_PLACEHOLDER_PATHS.female;
  return STUDENT_PHOTO_PLACEHOLDER_PATHS.neutral;
}
