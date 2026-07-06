'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconSearch } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock';
import { isStudentSpotlightOpenShortcut } from '../utils/student-spotlight-utils';
import { StudentSpotlight } from './student-spotlight';

export function AdminStudentSpotlightHost() {
  const t = useT();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);

  useBodyScrollLock(open);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isStudentSpotlightOpenShortcut(event)) return;
      event.preventDefault();
      toggle();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm student-spotlight-trigger"
        onClick={() => setOpen(true)}
        aria-label={t('admin.spotlight.openButton')}
      >
        <IconSearch size={18} />
        <span className="student-spotlight-trigger__kbd">{t('admin.spotlight.shortcutLabel')}</span>
      </button>
      <StudentSpotlight open={open} onClose={close} />
    </>
  );
}
