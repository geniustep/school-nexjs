'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

type MobileNavOverlay = 'main-drawer' | 'context-nav' | null;

type MobileNavCoordinatorValue = {
  mainDrawerOpen: boolean;
  contextNavOpen: boolean;
  setMainDrawerOpen: (open: boolean) => void;
  setContextNavOpen: (open: boolean) => void;
  closeAll: () => void;
};

const MobileNavCoordinatorContext = createContext<MobileNavCoordinatorValue | null>(null);

export function MobileNavCoordinatorProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [overlay, setOverlay] = useState<MobileNavOverlay>(null);

  useEffect(() => {
    setOverlay(null);
  }, [pathname]);

  const setMainDrawerOpen = useCallback((open: boolean) => {
    setOverlay(open ? 'main-drawer' : (current) => (current === 'main-drawer' ? null : current));
  }, []);

  const setContextNavOpen = useCallback((open: boolean) => {
    setOverlay(open ? 'context-nav' : (current) => (current === 'context-nav' ? null : current));
  }, []);

  const closeAll = useCallback(() => {
    setOverlay(null);
  }, []);

  const value = useMemo<MobileNavCoordinatorValue>(
    () => ({
      mainDrawerOpen: overlay === 'main-drawer',
      contextNavOpen: overlay === 'context-nav',
      setMainDrawerOpen,
      setContextNavOpen,
      closeAll,
    }),
    [overlay, setMainDrawerOpen, setContextNavOpen, closeAll],
  );

  return (
    <MobileNavCoordinatorContext.Provider value={value}>
      {children}
    </MobileNavCoordinatorContext.Provider>
  );
}

export function useMobileNavCoordinator(): MobileNavCoordinatorValue {
  const ctx = useContext(MobileNavCoordinatorContext);
  if (!ctx) {
    throw new Error('useMobileNavCoordinator must be used within MobileNavCoordinatorProvider');
  }
  return ctx;
}
