'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Deep-link a drawer via `?action=` — dismiss clears local state and strips the param from the URL. */
export function useDrawerActionParam(expectedAction = 'add') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const actionActive = searchParams.get('action') === expectedAction;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (actionActive) setDismissed(false);
  }, [actionActive]);

  const openFromAction = actionActive && !dismissed;

  const dismissActionParam = useCallback(() => {
    setDismissed(true);
    if (!actionActive) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('action');
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    // Sync URL immediately so the drawer cannot reopen while router.replace is pending.
    window.history.replaceState(window.history.state, '', next);
    router.replace(next, { scroll: false });
  }, [actionActive, pathname, router, searchParams]);

  return { openFromAction, dismissActionParam };
}
