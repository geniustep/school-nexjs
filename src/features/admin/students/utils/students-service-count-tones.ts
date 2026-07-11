/**
 * Visual tone tokens for students list service-count cards.
 * Mapped by service `code` only — never by localized name.
 */

export type StudentsServiceCountTone =
  | 'neutral'
  | 'blue'
  | 'violet'
  | 'green'
  | 'orange'
  | 'teal'
  | 'slate'
  | 'amber'
  | 'cyan'
  | 'rose'
  | 'indigo';

const TONE_BY_CODE: Record<string, StudentsServiceCountTone> = {
  TRANSPORT: 'blue',
  REGISTRATION: 'violet',
  TUITION: 'green',
  CANTEEN: 'orange',
  DAYCARE: 'teal',
  BOOKS: 'slate',
  ACTIVITIES: 'cyan',
  INSURANCE: 'amber',
  TRIPS: 'indigo',
  OTHER: 'rose',
};

const FALLBACK_TONES: StudentsServiceCountTone[] = [
  'blue',
  'green',
  'orange',
  'teal',
  'violet',
  'amber',
  'cyan',
  'indigo',
  'slate',
  'rose',
];

export function resolveStudentsServiceCountTone(
  code: string | null | undefined,
  index = 0,
): StudentsServiceCountTone {
  const key = (code ?? '').trim().toUpperCase();
  if (key && TONE_BY_CODE[key]) return TONE_BY_CODE[key];
  return FALLBACK_TONES[Math.abs(index) % FALLBACK_TONES.length] ?? 'slate';
}

export function studentsServiceCountToneClass(
  tone: StudentsServiceCountTone,
): string {
  return `students-service-counts__card--tone-${tone}`;
}
