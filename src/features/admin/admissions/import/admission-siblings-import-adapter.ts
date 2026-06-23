import type { SiblingLine } from '@/types/sibling-line';
import { buildSiblingLinesPayload } from '../utils/sibling-lines';

export interface AdmissionImportSiblingsInput {
  has_siblings?: boolean | string | number | null;
  siblings_levels?: string | null;
  siblings_text?: string | null;
}

export interface AdmissionImportSiblingsPayload {
  has_siblings?: boolean;
  siblings_levels?: string;
  siblings_raw_text?: string;
  sibling_lines?: SiblingLine[];
}

const SIBLING_HINT_RE =
  /(?:أخت|اخت|(?:^|[\s،,])أخ(?:[\s،,]|$)|(?:^|[\s،,])اخ(?:[\s،,]|$)|brother|brothers|sister|sisters|fr[èe]re|sœur|soeur|sibling|إخوة|اخوة|أخوة)/i;

const CURRENT_STUDENT_RE =
  /(?:تلميذ|طالب|élève|eleve|student)\s*(?:حالي|actuel|current)|(?:حالي|actuel|current)\s*(?:تلميذ|طالب|élève|eleve|student)/i;

function trim(value: unknown): string {
  if (value == null || value === false) return '';
  return String(value).trim();
}

function normalizeImportBool(value: unknown): boolean | null {
  if (value === true || value === 'true' || value === 1 || value === '1' || value === 'yes' || value === 'oui' || value === 'نعم') {
    return true;
  }
  if (value === false || value === 'false' || value === 0 || value === '0' || value === 'no' || value === 'non' || value === 'لا') {
    return false;
  }
  return null;
}

export function inferHasSiblingsFromText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return SIBLING_HINT_RE.test(trimmed);
}

function splitSiblingSegments(text: string): string[] {
  return text
    .split(/[\n\r;|]+|(?:\s+و\s+)|(?:\s*,\s*)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseRelationship(text: string): SiblingLine['relationship'] | null {
  if (/(?:أخت|اخت|sister|sœur|soeur)/i.test(text)) return 'sister';
  if (/(?:أخ|اخ|brother|fr[èe]re)/i.test(text)) return 'brother';
  return null;
}

function parseAge(text: string): number | null {
  const match = text.match(/(\d{1,2})\s*(?:سنو?ات?|سنة|ans|years?|year\b)/i);
  if (!match) return null;
  const age = Number(match[1]);
  return age >= 1 && age <= 25 ? age : null;
}

function parseLevelText(text: string): string | null {
  const aep = text.match(/(\d{1,2})\s*AEP/i);
  if (aep) return `${aep[1]}AEP`;

  const ordinals: Array<[RegExp, string]> = [
    [/ال(?:أ|ا)ول|première?\s*année|1(?:er|ère)?\s*AEP/i, '1AEP'],
    [/الثاني|deuxième?\s*année|2(?:e|ème)?\s*AEP/i, '2AEP'],
    [/الثالث|troisième?\s*année|3(?:e|ème)?\s*AEP/i, '3AEP'],
    [/الرابع|quatrième?\s*année|4(?:e|ème)?\s*AEP/i, '4AEP'],
    [/الخامس|cinquième?\s*année|5(?:e|ème)?\s*AEP/i, '5AEP'],
    [/السادس|sixième?\s*année|6(?:e|ème)?\s*AEP/i, '6AEP'],
  ];
  for (const [pattern, label] of ordinals) {
    if (pattern.test(text)) return label;
  }

  const inLevel = text.match(/(?:في|au|level|المستوى)\s*(?:ال)?([\u0600-\u06FF\w\d-]+)/i);
  if (inLevel?.[1]) return inLevel[1].trim();

  return null;
}

export function parseSiblingLineFromText(segment: string): SiblingLine | null {
  const text = segment.trim();
  if (!text) return null;

  const relationship = parseRelationship(text);
  const age = parseAge(text);
  const levelText = parseLevelText(text);
  const isCurrentStudent = CURRENT_STUDENT_RE.test(text);

  if (!relationship && age == null && !levelText && !isCurrentStudent) {
    return null;
  }

  const line: SiblingLine = { is_current_student: isCurrentStudent };
  if (relationship) line.relationship = relationship;
  if (age != null) line.age_years_at_admission = age;
  if (levelText) line.level_text = levelText;
  return line;
}

export function parseSiblingLinesFromText(text: string): SiblingLine[] {
  const segments = splitSiblingSegments(text);
  const lines: SiblingLine[] = [];
  segments.forEach((segment, index) => {
    const parsed = parseSiblingLineFromText(segment);
    if (parsed) lines.push({ ...parsed, sequence: index + 1 });
  });
  return lines;
}

export function mapAdmissionImportSiblingsFields(
  input: AdmissionImportSiblingsInput,
): AdmissionImportSiblingsPayload {
  const levels = trim(input.siblings_levels);
  const freeText = trim(input.siblings_text);
  const rawText = freeText || levels;

  let hasSiblings = normalizeImportBool(input.has_siblings);
  if (hasSiblings == null && rawText) {
    hasSiblings = inferHasSiblingsFromText(rawText);
  }

  const payload: AdmissionImportSiblingsPayload = {};
  if (hasSiblings === true) payload.has_siblings = true;
  if (hasSiblings === false) payload.has_siblings = false;
  if (levels) payload.siblings_levels = levels;
  if (rawText) payload.siblings_raw_text = rawText;

  const parsed = parseSiblingLinesFromText(rawText);
  const siblingLines = buildSiblingLinesPayload(parsed);
  if (siblingLines?.length) payload.sibling_lines = siblingLines;

  return payload;
}
