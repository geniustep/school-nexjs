'use client';

import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

const VIEWPORT_GAP = 8;
const PANEL_OFFSET = 6;

export type AnchoredPopoverPlacement = 'bottom' | 'top';

export type AnchoredPopoverPosition = {
  top: number;
  left: number;
  width: number;
  placement: AnchoredPopoverPlacement;
};

export function useAnchoredPopoverPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
): AnchoredPopoverPosition | null {
  const [position, setPosition] = useState<AnchoredPopoverPosition | null>(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const rect = anchor.getBoundingClientRect();
    const panelHeight = panel.offsetHeight;
    const width = rect.width;

    let left = rect.left;
    left = Math.max(VIEWPORT_GAP, Math.min(left, window.innerWidth - width - VIEWPORT_GAP));

    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
    const spaceAbove = rect.top - VIEWPORT_GAP;
    const openBelow = panelHeight <= spaceBelow || spaceBelow >= spaceAbove;
    const placement: AnchoredPopoverPlacement = openBelow ? 'bottom' : 'top';

    let top = openBelow ? rect.bottom + PANEL_OFFSET : rect.top - panelHeight - PANEL_OFFSET;
    top = Math.max(VIEWPORT_GAP, Math.min(top, window.innerHeight - panelHeight - VIEWPORT_GAP));

    setPosition({ top, left, width, placement });
  }, [anchorRef, panelRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    update();
    const frame = window.requestAnimationFrame(update);

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return position;
}
