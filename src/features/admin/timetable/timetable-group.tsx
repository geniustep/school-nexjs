'use client';
import { useId, useState, type ReactNode } from 'react';
import type { TranslateFn } from '@/features/i18n/locale-context';

/** Mount only open groups so a school-wide view does not render 50 weekly grids. */
export function TimetableGroup({ name, count, initiallyOpen, children, t }: {
  name: string; count: number; initiallyOpen: boolean; children: ReactNode; t: TranslateFn;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  return <section className="timetable-group">
    <h3><button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <span dir="auto">{name}</span><span className="muted tiny">{t('admin.timetableList.slotsCount',{count})} · {t(open ? 'timetableFilters.collapse' : 'timetableFilters.expand')}</span>
    </button></h3>
    <div id={id}>{open && children}</div>
  </section>;
}
