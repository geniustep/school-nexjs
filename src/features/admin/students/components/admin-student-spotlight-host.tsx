'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IconSearch } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { cn } from '@/lib/utils/cn';
import {
  getStudentSpotlightShortcutAction,
  isStudentSpotlightOpenShortcut,
} from '../utils/student-spotlight-utils';
import { StudentSpotlight } from './student-spotlight';

type AdminStudentSpotlightContextValue = {
  openAndFocus: () => void;
};

const AdminStudentSpotlightContext = createContext<AdminStudentSpotlightContextValue | null>(null);

function useAdminStudentSpotlight() {
  const context = useContext(AdminStudentSpotlightContext);
  if (!context) {
    throw new Error('AdminStudentSpotlightTrigger must be used within AdminStudentSpotlightHost');
  }
  return context;
}

export function AdminStudentSpotlightHost({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const openRef = useRef(open);

  const close = useCallback(() => setOpen(false), []);
  const openAndFocus = useCallback(() => {
    setOpen(true);
    setFocusRequest((current) => current + 1);
  }, []);

  useBodyScrollLock(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isStudentSpotlightOpenShortcut(event)) return;
      event.preventDefault();
      const action = getStudentSpotlightShortcutAction(openRef.current);
      if (action === 'open') {
        setOpen(true);
      }
      setFocusRequest((current) => current + 1);
    }

    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, []);

  return (
    <AdminStudentSpotlightContext.Provider value={{ openAndFocus }}>
      {children}
      {open ? <StudentSpotlight onClose={close} focusRequest={focusRequest} /> : null}
    </AdminStudentSpotlightContext.Provider>
  );
}

export function AdminStudentSpotlightTrigger({
  variant = 'desktop',
}: {
  variant?: 'desktop' | 'mobile';
}) {
  const t = useT();
  const { openAndFocus } = useAdminStudentSpotlight();
  const isMobile = variant === 'mobile';

  return (
    <button
      type="button"
      className={cn(
        'btn btn--ghost btn--sm student-spotlight-trigger',
        isMobile && 'student-spotlight-trigger--mobile',
      )}
      onClick={openAndFocus}
      aria-label={t('admin.spotlight.openButton')}
      title={t('admin.spotlight.openButton')}
    >
      <IconSearch size={18} aria-hidden="true" />
      {!isMobile ? (
        <>
          <span className="student-spotlight-trigger__label">{t('admin.spotlight.openButton')}</span>
          <span className="student-spotlight-trigger__kbd" aria-hidden="true">
            {t('admin.spotlight.shortcutLabel')}
          </span>
        </>
      ) : null}
    </button>
  );
}
