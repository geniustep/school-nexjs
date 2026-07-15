/**
 * Pointer-based Kanban drag helpers (no HTML5 DnD).
 * Hit-tests columns under the cursor via [data-stage].
 */

export type KanbanPointerDragSession = {
  admissionId: number;
  pointerId: number;
  startX: number;
  startY: number;
  activated: boolean;
};

export const KANBAN_POINTER_DRAG_THRESHOLD_PX = 6;

export function shouldActivateKanbanPointerDrag(
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
  threshold = KANBAN_POINTER_DRAG_THRESHOLD_PX,
): boolean {
  const dx = clientX - startX;
  const dy = clientY - startY;
  return dx * dx + dy * dy >= threshold * threshold;
}

/** Resolve Kanban column id under point (ignores drag ghost). */
export function resolveKanbanColumnIdAtPoint(
  clientX: number,
  clientY: number,
  doc: { elementFromPoint: (x: number, y: number) => Element | null } = document,
): string | null {
  const el = doc.elementFromPoint(clientX, clientY);
  if (!el || typeof (el as Element).closest !== 'function') return null;
  const column = (el as Element).closest('[data-stage]');
  if (!column) return null;
  const stage = column.getAttribute('data-stage');
  return stage && stage.trim() ? stage.trim() : null;
}
