'use client';

import { useCallback } from 'react';

export function useSetupRefresh(reloadFns: Array<() => void>) {
  const refresh = useCallback(() => {
    for (const fn of reloadFns) fn();
  }, [reloadFns]);

  return { refresh };
}
