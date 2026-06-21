'use client';

import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

const VIEWPORT_GAP = 8;
const PANEL_OFFSET = 4;

export type FloatingMenuPlacement = 'bottom' | 'top';

export type FloatingMenuPosition = {
  top: number;
  left: number;
  placement: FloatingMenuPlacement;
};

export function useFloatingMenuPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
): FloatingMenuPosition | null {
  const [position, setPosition] = useState<FloatingMenuPosition | null>(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const rect = anchor.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const isRtl = document.documentElement.getAttribute('dir') === 'rtl';

    let left = isRtl ? rect.left : rect.right - panelWidth;
    left = Math.max(VIEWPORT_GAP, Math.min(left, window.innerWidth - panelWidth - VIEWPORT_GAP));

    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
    const spaceAbove = rect.top - VIEWPORT_GAP;
    const openBelow = panelHeight <= spaceBelow || spaceBelow >= spaceAbove;
    const placement: FloatingMenuPlacement = openBelow ? 'bottom' : 'top';

    let top = openBelow ? rect.bottom + PANEL_OFFSET : rect.top - panelHeight - PANEL_OFFSET;
    top = Math.max(VIEWPORT_GAP, Math.min(top, window.innerHeight - panelHeight - VIEWPORT_GAP));

    setPosition({ top, left, placement });
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
