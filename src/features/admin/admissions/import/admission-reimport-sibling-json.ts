import type { SiblingLine } from '@/types/sibling-line';
import type { ParsedSiblingLinesJson } from './admission-reimport-types';

const ALLOWED_KEYS = new Set([
  'name',
  'relationship',
  'birth_date',
  'age_years_at_admission',
  'level_id',
  'level_text',
  'is_current_student',
  'linked_student_id',
  'notes',
  'sequence',
]);

function trimStr(value: unknown): string | undefined {
  if (value == null || value === false) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function pickNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = trimStr(value);
  if (!text) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function pickBool(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}

function normalizeRelationship(value: unknown): SiblingLine['relationship'] | undefined {
  const text = trimStr(value)?.toLowerCase();
  if (!text) return undefined;
  if (text === 'brother' || text === 'sister') return text;
  if (/^(?:أخ|اخ|brother|fr[èe]re)/i.test(text)) return 'brother';
  if (/^(?:أخت|اخت|sister|sœur|soeur)/i.test(text)) return 'sister';
  return undefined;
}

function sanitizeLine(raw: unknown, index: number): SiblingLine | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const line: SiblingLine = {};

  for (const key of Object.keys(obj)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (key === 'relationship') {
      const rel = normalizeRelationship(obj[key]);
      if (rel) line.relationship = rel;
      continue;
    }
    if (key === 'is_current_student') {
      const b = pickBool(obj[key]);
      if (b != null) line.is_current_student = b;
      continue;
    }
    if (key === 'age_years_at_admission' || key === 'level_id' || key === 'linked_student_id' || key === 'sequence') {
      const n = pickNumber(obj[key]);
      if (n != null) (line as Record<string, unknown>)[key] = n;
      continue;
    }
    const text = trimStr(obj[key]);
    if (text) (line as Record<string, unknown>)[key] = text;
  }

  const hasContent =
    line.name ||
    line.relationship ||
    line.birth_date ||
    line.age_years_at_admission != null ||
    line.level_id != null ||
    line.level_text ||
    line.is_current_student != null ||
    line.linked_student_id != null ||
    line.notes;

  if (!hasContent) return null;
  if (line.sequence == null) line.sequence = index + 1;
  return line;
}

/** Parse sibling_lines_json conservatively — only explicit source fields. */
export function parseSiblingLinesJson(raw: unknown): ParsedSiblingLinesJson {
  if (raw == null || raw === '') return {};
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return {};
    try {
      parsed = JSON.parse(text);
    } catch {
      return { error: 'invalid_json' };
    }
  }
  if (!Array.isArray(parsed)) {
    return { error: 'not_array' };
  }
  const lines: SiblingLine[] = [];
  parsed.forEach((item, index) => {
    const line = sanitizeLine(item, index);
    if (line) lines.push(line);
  });
  if (!lines.length) return { error: 'empty_after_sanitize' };
  return { lines };
}
