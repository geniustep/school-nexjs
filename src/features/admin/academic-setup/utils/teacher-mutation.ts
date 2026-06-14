import type { Teacher } from '@/types/teacher';

type TeacherMutationPayload = {
  item?: Teacher;
  id?: number;
  name?: string;
};

/** Normalize create/update teacher responses (`data` or `data.item`). */
export function extractTeacherFromMutation(data: unknown): Teacher | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as TeacherMutationPayload;
  if (record.item && typeof record.item.id === 'number') return record.item;
  if (typeof record.id === 'number' && typeof record.name === 'string') {
    return record as Teacher;
  }
  return null;
}

export function extractTeacherIdFromMutation(data: unknown): number | null {
  return extractTeacherFromMutation(data)?.id ?? null;
}
