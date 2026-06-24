import type { SiblingLine } from '@/types/sibling-line';

function trim(value: unknown): string {
  if (value == null || value === false) return '';
  return String(value).trim();
}

function positiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.trunc(value);
  const raw = trim(value);
  if (!raw || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function optionalBool(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}

export function normalizeSiblingLine(raw: unknown): SiblingLine | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const line: SiblingLine = {
    name: trim(item.name) || null,
    relationship: trim(item.relationship) || null,
    birth_date: trim(item.birth_date) || null,
    age_years_at_admission:
      typeof item.age_years_at_admission === 'number' && Number.isFinite(item.age_years_at_admission)
        ? item.age_years_at_admission
        : positiveInt(item.age_years_at_admission),
    level_id: positiveInt(item.level_id),
    level_text: trim(item.level_text) || null,
    is_current_student: optionalBool(item.is_current_student),
    linked_student_id: positiveInt(item.linked_student_id),
    notes: trim(item.notes) || null,
    sequence:
      typeof item.sequence === 'number' && Number.isFinite(item.sequence) ? item.sequence : null,
  };

  const hasContent = Boolean(
    line.name ||
      line.relationship ||
      line.birth_date ||
      line.age_years_at_admission != null ||
      line.level_id != null ||
      line.level_text ||
      line.notes ||
      line.is_current_student === true ||
      line.linked_student_id != null,
  );
  return hasContent ? line : null;
}

export function normalizeSiblingLines(raw: unknown): SiblingLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeSiblingLine).filter((line): line is SiblingLine => line != null);
}

export function siblingLinesFingerprint(lines: SiblingLine[]): string {
  return JSON.stringify(
    lines.map((line) => ({
      name: line.name ?? '',
      relationship: line.relationship ?? '',
      birth_date: line.birth_date ?? '',
      age_years_at_admission: line.age_years_at_admission ?? null,
      level_id: line.level_id ?? null,
      level_text: line.level_text ?? '',
      is_current_student: line.is_current_student ?? false,
      linked_student_id: line.linked_student_id ?? null,
      notes: line.notes ?? '',
      sequence: line.sequence ?? null,
    })),
  );
}

export function buildSiblingLinesPayload(lines: SiblingLine[]): SiblingLine[] | undefined {
  const cleaned = lines
    .map((line, index) => {
      const payload: SiblingLine = {};
      const name = trim(line.name);
      if (name) payload.name = name;
      const relationship = trim(line.relationship);
      if (relationship) payload.relationship = relationship;
      const birthDate = trim(line.birth_date);
      if (birthDate) payload.birth_date = birthDate;
      if (line.age_years_at_admission != null && line.age_years_at_admission >= 0) {
        payload.age_years_at_admission = line.age_years_at_admission;
      }
      if (line.level_id != null && line.level_id > 0) payload.level_id = line.level_id;
      const levelText = trim(line.level_text);
      if (levelText) payload.level_text = levelText;
      if (line.is_current_student === true) payload.is_current_student = true;
      if (line.linked_student_id != null && line.linked_student_id > 0) {
        payload.linked_student_id = line.linked_student_id;
      }
      const notes = trim(line.notes);
      if (notes) payload.notes = notes;
      payload.sequence = line.sequence ?? index + 1;
      return Object.keys(payload).length > 1 || payload.sequence != null ? payload : null;
    })
    .filter((line): line is SiblingLine => line != null);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function emptySiblingLine(sequence = 1): SiblingLine {
  return { sequence, is_current_student: false };
}

/** Returns an error message when a current-student sibling has no linked student. */
export function validateSiblingLinesLinkedStudents(
  lines: SiblingLine[],
  t: (key: string) => string,
): string | null {
  for (const line of lines) {
    if (
      line.is_current_student === true &&
      (line.linked_student_id == null || line.linked_student_id <= 0)
    ) {
      return t('admin.siblings.linkedStudentRequired');
    }
  }
  return null;
}
