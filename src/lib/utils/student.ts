/** Shared student name fields returned by Odoo APIs (with legacy fallbacks). */
export interface StudentNameFields {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
}

/** Display name priority: full_name → name → first_name + last_name → — */
export function getStudentDisplayName(student: StudentNameFields | null | undefined): string {
  if (!student) return '—';

  const full = student.full_name?.trim();
  if (full) return full;

  const legacy = student.name?.trim();
  if (legacy) return legacy;

  const combined = [student.first_name?.trim(), student.last_name?.trim()]
    .filter(Boolean)
    .join(' ');
  if (combined) return combined;

  return '—';
}
