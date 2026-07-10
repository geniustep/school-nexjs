import type { Ref } from '@/types/api';

export const TEACHERS_PAGE_SIZE = 20;

export function formatTeacherRefList(refs: Ref[], fallback: string): string {
  if (!refs.length) return fallback;
  return refs.map((ref) => ref.name).join(', ');
}
