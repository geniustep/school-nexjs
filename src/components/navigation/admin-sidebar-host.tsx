'use client';

import { useCallback, useEffect } from 'react';
import { AdminSidebar } from '@/components/navigation/admin-sidebar';
import type { NavSection } from '@/components/navigation/nav-config';
import type { CurrentUser } from '@/types/user';
import { useT } from '@/features/i18n/locale-context';

/** Admin chrome host: official Focus sidebar only (no preview/lab resolver). */
export function AdminSidebarHost({
  user,
  sections,
  roleLabel,
  scopeDesc,
  mainDrawerOpen,
  setMainDrawerOpen,
  loggingOut,
  onLogout,
  onCollapsedChange,
}: {
  user: CurrentUser;
  sections: NavSection[];
  roleLabel: string;
  scopeDesc: string | null;
  mainDrawerOpen: boolean;
  setMainDrawerOpen: (open: boolean) => void;
  loggingOut: boolean;
  onLogout: () => void;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const t = useT();
  const onNavigate = useCallback(() => setMainDrawerOpen(false), [setMainDrawerOpen]);

  useEffect(() => {
    if (!mainDrawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMainDrawerOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mainDrawerOpen, setMainDrawerOpen]);

  return (
    <>
      {mainDrawerOpen ? (
        <button
          type="button"
          className="scrim"
          aria-label={t('common.close')}
          onClick={() => setMainDrawerOpen(false)}
        />
      ) : null}
      <AdminSidebar
        user={user}
        sections={sections}
        roleLabel={roleLabel}
        scopeDesc={scopeDesc}
        mainDrawerOpen={mainDrawerOpen}
        loggingOut={loggingOut}
        onLogout={onLogout}
        onNavigate={onNavigate}
        onCollapsedChange={onCollapsedChange}
      />
    </>
  );
}
