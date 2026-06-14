import type { TeacherOptions, TeacherOptionsPayload } from '@/types/teacher';

function list(value: unknown): { value: string; label: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { value: string; label: string } => {
      return (
        !!item &&
        typeof item === 'object' &&
        typeof (item as { value?: unknown }).value === 'string' &&
        typeof (item as { label?: unknown }).label === 'string'
      );
    })
    .map((item) => ({ value: item.value, label: item.label }));
}

export function normalizeTeacherOptions(
  data: TeacherOptionsPayload | null | undefined,
): TeacherOptions | null {
  if (!data || typeof data !== 'object') return null;
  return {
    teacherTypes: list(data.teacher_types),
    qualifications: list(data.qualifications),
    contractTypes: list(data.contract_types),
    statuses: list(data.statuses),
    genders: list(data.genders),
    schools: Array.isArray(data.schools) ? data.schools : [],
    defaults: {
      teacherType: data.defaults?.teacher_type,
      status: data.defaults?.status,
      active: data.defaults?.active,
      preferCompactSchedule: data.defaults?.prefer_compact_schedule,
    },
    constraints: {
      weeklyHours: data.constraints?.weekly_hours,
      maxContinuousMinutes: data.constraints?.max_continuous_minutes,
      specialization: data.constraints?.specialization,
    },
  };
}
