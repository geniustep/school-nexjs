import type {
  AssessmentSlot,
  BatchEntryUpdateResponse,
  CompletionSummary,
  GradebookContext,
  GradebookDetail,
  GradebookMatrixEntry,
  GradebookRosterRow,
  GradebookStructure,
  ParticipationState,
  ScorableCell,
  SubjectComponent,
} from '@/types/gradebook';
import { normalizeGradebookAllowedActions } from './gradebook-allowed-actions';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const obj = asRecord(value);
  if (obj && Array.isArray(obj.entries)) return obj.entries;
  return [];
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function str(value: unknown): string | null {
  if (typeof value === 'string') return value;
  return null;
}

function refFrom(value: unknown): { id: number; name: string } | null {
  const obj = asRecord(value);
  if (!obj) return null;
  const id = num(obj.id);
  const name = str(obj.name);
  if (id == null || !name) return null;
  return { id, name };
}

function normalizeSlot(raw: unknown): AssessmentSlot | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const slotId = num(obj.slot_id) ?? num(obj.id);
  const label = str(obj.label) ?? str(obj.name);
  if (slotId == null || !label) return null;
  return {
    slot_id: slotId,
    label,
    sequence: num(obj.sequence) ?? undefined,
  };
}

function normalizeComponent(raw: unknown): SubjectComponent | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const componentId = num(obj.component_id) ?? num(obj.id);
  const label = str(obj.label) ?? str(obj.name);
  if (componentId == null || !label) return null;
  return {
    component_id: componentId,
    label,
    code: str(obj.code),
  };
}

function normalizeCell(
  raw: unknown,
  slotsById: Map<number, AssessmentSlot>,
  componentsById: Map<number, SubjectComponent>,
): ScorableCell | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const cellId = num(obj.cell_id) ?? num(obj.id);
  const slotId = num(obj.slot_id);
  const max = num(obj.effective_max_score);
  if (cellId == null || slotId == null || max == null) return null;
  const componentId = num(obj.component_id);
  return {
    cell_id: cellId,
    slot_id: slotId,
    component_id: componentId,
    slot_label: str(obj.slot_label) ?? slotsById.get(slotId)?.label ?? null,
    component_label:
      str(obj.component_label) ??
      (componentId != null ? componentsById.get(componentId)?.label ?? null : null),
    effective_max_score: max,
  };
}

function normalizeStructure(raw: unknown): GradebookStructure {
  const obj = asRecord(raw) ?? {};
  const slots = asArray(obj.slots)
    .map(normalizeSlot)
    .filter((slot): slot is AssessmentSlot => slot != null);
  const components = asArray(obj.components)
    .map(normalizeComponent)
    .filter((component): component is SubjectComponent => component != null);
  const slotsById = new Map(slots.map((slot) => [slot.slot_id, slot]));
  const componentsById = new Map(components.map((component) => [component.component_id, component]));
  const cells = asArray(obj.cells)
    .map((cell) => normalizeCell(cell, slotsById, componentsById))
    .filter((cell): cell is ScorableCell => cell != null);
  const mode = str(obj.mode) === 'composite' || components.length > 0 ? 'composite' : 'simple';
  return { mode, slots, components, cells };
}

function normalizeRosterRow(raw: unknown): GradebookRosterRow | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const gradebookStudentId = num(obj.gradebook_student_id);
  const studentId = num(obj.student_id);
  const displayName = str(obj.display_name);
  const rosterSequence = num(obj.roster_sequence);
  if (gradebookStudentId == null || studentId == null || !displayName || rosterSequence == null) {
    return null;
  }
  return {
    gradebook_student_id: gradebookStudentId,
    student_id: studentId,
    display_name: displayName,
    massar_code: str(obj.massar_code),
    roster_sequence: rosterSequence,
  };
}

function normalizeMatrixEntry(raw: unknown): GradebookMatrixEntry | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const studentLineId = num(obj.student_line_id);
  const cellId = num(obj.cell_id);
  if (studentLineId == null || cellId == null) return null;
  const participation = (str(obj.participation_state) ?? 'not_entered') as ParticipationState;
  return {
    student_line_id: studentLineId,
    cell_id: cellId,
    score: num(obj.score),
    score_is_set: Boolean(obj.score_is_set),
    participation_state: participation,
    comment: str(obj.comment),
    editable: obj.editable !== false,
  };
}

function normalizeCompletion(raw: unknown): CompletionSummary {
  const obj = asRecord(raw) ?? {};
  return {
    completion_percent: num(obj.completion_percent) ?? 0,
    unresolved_entries: num(obj.unresolved_entries) ?? 0,
    students_total: num(obj.students_total) ?? 0,
    cells_total: num(obj.cells_total) ?? 0,
  };
}

function normalizeContext(raw: unknown, fallbackState?: string): GradebookContext {
  const obj = asRecord(raw) ?? {};
  return {
    subject: refFrom(obj.subject),
    class: refFrom(obj.class),
    academic_year: refFrom(obj.academic_year),
    term: refFrom(obj.term),
    teacher: refFrom(obj.teacher),
    scheme: refFrom(obj.scheme),
    state: str(obj.state) ?? fallbackState ?? 'draft',
  };
}

/** Maps live Odoo Gradebook detail wire format into the UI contract. */
export function normalizeGradebookDetailPayload(raw: unknown): GradebookDetail {
  const obj = asRecord(raw) ?? {};
  const id = num(obj.id) ?? 0;
  const structure = normalizeStructure(obj.structure);
  const roster = asArray(obj.roster)
    .map(normalizeRosterRow)
    .filter((row): row is GradebookRosterRow => row != null);
  const matrix = asArray(obj.matrix)
    .map(normalizeMatrixEntry)
    .filter((entry): entry is GradebookMatrixEntry => entry != null);
  const context = normalizeContext(obj.context, str(asRecord(obj.lifecycle)?.state) ?? undefined);
  return {
    id,
    context,
    structure,
    roster,
    matrix,
    completion: normalizeCompletion(obj.completion),
    allowed_actions: normalizeGradebookAllowedActions(
      obj.allowed_actions as GradebookDetail['allowed_actions'],
    ),
  };
}

export function normalizeBatchEntryUpdateResponse(raw: unknown): BatchEntryUpdateResponse {
  const obj = asRecord(raw) ?? {};
  const changed = asArray(obj.entries_changed)
    .map(normalizeMatrixEntry)
    .filter((entry): entry is GradebookMatrixEntry => entry != null);
  const entries = asArray(obj.entries)
    .map(normalizeMatrixEntry)
    .filter((entry): entry is GradebookMatrixEntry => entry != null);
  return {
    completion: normalizeCompletion(obj.completion),
    entries: changed.length ? changed : entries,
  };
}
