import { describe, expect, it, vi } from 'vitest';
import {
  resolveKanbanColumnIdAtPoint,
  shouldActivateKanbanPointerDrag,
} from './admission-kanban-pointer-drag';

describe('kanban pointer drag helpers', () => {
  it('activates after moderate movement', () => {
    expect(shouldActivateKanbanPointerDrag(0, 0, 2, 2)).toBe(false);
    expect(shouldActivateKanbanPointerDrag(0, 0, 10, 0)).toBe(true);
  });

  it('resolves column stage under pointer', () => {
    const column = {
      getAttribute: (name: string) => (name === 'data-stage' ? 'follow_up' : null),
    };
    const target = {
      closest: (sel: string) => (sel.includes('data-stage') ? column : null),
    };
    const doc = {
      elementFromPoint: vi.fn(() => target),
    };
    expect(resolveKanbanColumnIdAtPoint(12, 34, doc as never)).toBe('follow_up');
    expect(doc.elementFromPoint).toHaveBeenCalledWith(12, 34);
  });

  it('returns null when no column under pointer', () => {
    const doc = {
      elementFromPoint: () => ({
        closest: () => null,
      }),
    };
    expect(resolveKanbanColumnIdAtPoint(1, 1, doc as never)).toBeNull();
  });
});
