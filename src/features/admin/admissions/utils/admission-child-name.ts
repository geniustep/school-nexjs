import { buildFullNamePreview } from '@/features/admin/students/utils/student-profile';

/** Build display / payload full name: Arabic first, then French. */
export function buildAdmissionChildFullName(
  arFirst: string,
  arLast: string,
  frFirst: string,
  frLast: string,
): string {
  const ar = buildFullNamePreview(arFirst, arLast);
  if (ar) return ar;
  return buildFullNamePreview(frFirst, frLast);
}
