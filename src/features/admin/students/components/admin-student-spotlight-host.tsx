'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconSearch } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import {
  getStudentSpotlightShortcutAction,
  isStudentSpotlightOpenShortcut,
} from '../utils/student-spotlight-utils';
import { StudentSpotlight } from './student-spotlight';

export function AdminStudentSpotlightHost() {
  const t = useT();
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
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm student-spotlight-trigger"
        onClick={openAndFocus}
        aria-label={t('admin.spotlight.openButton')}
      >
        <IconSearch size={18} />
        <span className="student-spotlight-trigger__kbd">{t('admin.spotlight.shortcutLabel')}</span>
      </button>
      {open ? <StudentSpotlight onClose={close} focusRequest={focusRequest} /> : null}
    </>
  );
}
