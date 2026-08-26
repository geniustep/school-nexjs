'use client';

import { useEffect } from 'react';

let bodyScrollLockCount = 0;
let originalBodyOverflow: string | null = null;

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  bodyScrollLockCount += 1;
}

function unlockBodyScroll() {
  if (bodyScrollLockCount === 0) return;

  bodyScrollLockCount -= 1;
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow ?? '';
    originalBodyOverflow = null;
  }
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    lockBodyScroll();
    return unlockBodyScroll;
  }, [active]);
}
