'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconBookOpen,
  IconClipboard,
  IconMoreHorizontal,
  IconWallet,
} from '@/components/icons/admin-icons';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import { studentKanbanLevelShortLabel } from '../utils/student-kanban-class-short-label';
import {
  resolveStudentKanbanQuickActions,
  type StudentKanbanAction,
} from '../utils/student-kanban-card-actions';
import { resolveStudentKanbanCycleTone } from '../utils/student-kanban-cycle-tone';
import { StudentPhotoVisual } from './student-photo-visual';
import type { Student } from '@/types/student';

function KanbanAttendanceIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function KanbanTimetableIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function KanbanQuickActionIcon({ action }: { action: StudentKanbanAction }) {
  const size = 16;
  switch (action.icon) {
    case 'results':
      return <IconClipboard size={size} aria-hidden="true" />;
    case 'documents':
      return <IconBookOpen size={size} aria-hidden="true" />;
    case 'attendance':
      return <KanbanAttendanceIcon size={size} />;
    case 'finance':
      return <IconWallet size={size} aria-hidden="true" />;
    case 'timetable':
      return <KanbanTimetableIcon size={size} />;
    default:
      return <IconClipboard size={size} aria-hidden="true" />;
  }
}

export function StudentsKanbanCard({
  student,
  selected = false,
  onToggleSelect,
}: {
  student: Student;
  selected?: boolean;
  onToggleSelect?: (studentId: number, next: boolean) => void;
}) {
  const t = useT();
  const user = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuUp, setMenuUp] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const displayName = getStudentDisplayName(student);
  const profileHref = `/admin/students/${student.id}`;
  const levelShort = studentKanbanLevelShortLabel(student.level);
  const cycleTone = resolveStudentKanbanCycleTone(student);
  const schoolId = student.school?.id;

  const { visible, more } = useMemo(
    () => resolveStudentKanbanQuickActions(user, student),
    [user, student],
  );

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function openMenu() {
    const card = cardRef.current;
    if (card) {
      const rect = card.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuUp(spaceBelow < 180);
    } else {
      setMenuUp(true);
    }
    setMenuOpen((open) => !open);
  }

  return (
    <article
      ref={cardRef}
      className={[
        'students-kanban-card',
        `students-kanban-card--cycle-${cycleTone}`,
        selected ? 'students-kanban-card--selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="students-kanban-card__cycle-accent" aria-hidden="true" />

      <div className="students-kanban-card__top">
        <div className="students-kanban-card__top-end">
          {levelShort ? (
            <span className="students-kanban-card__level" title={levelShort}>
              {levelShort}
            </span>
          ) : null}
          {student.school?.name ? (
            <span className="students-kanban-card__level" title={student.school.name} dir="auto">
              {student.school.name}
            </span>
          ) : null}
          <label className="students-kanban-card__select">
            <input
              type="checkbox"
              className="students-kanban-card__select-input"
              checked={selected}
              aria-label={t('admin.studentsList.kanban.selectStudent', { name: displayName })}
              onChange={(event) => onToggleSelect?.(student.id, event.target.checked)}
            />
            <span className="students-kanban-card__select-box" aria-hidden="true" />
          </label>
        </div>
      </div>

      <div className="students-kanban-card__body">
        <Link
          href={profileHref}
          data-all-schools-record-school-id={schoolId ?? undefined}
          data-all-schools-record-href={schoolId ? profileHref : undefined}
          className="students-kanban-card__avatar-link"
          aria-label={displayName}
        >
          <StudentPhotoVisual
            gender={student.gender}
            imageUrl={student.image_url}
            thumbnailUrl={student.thumbnail_url}
            displayName={displayName}
            className="students-kanban-card__avatar"
            imageClassName="students-kanban-card__avatar-img"
            placeholderClassName="students-kanban-card__avatar-img students-kanban-card__avatar-img--placeholder"
            photoAlt=""
            placeholderAriaLabel={t('admin.student360.editPage.photo.placeholderAria')}
          />
        </Link>

        <Link
          href={profileHref}
          data-all-schools-record-school-id={schoolId ?? undefined}
          data-all-schools-record-href={schoolId ? profileHref : undefined}
          className="students-kanban-card__name"
          dir="auto"
          title={displayName}
        >
          {displayName}
        </Link>
      </div>

      {(visible.length > 0 || more.length > 0) && (
        <div className="students-kanban-card__actions">
          {visible.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              data-all-schools-record-school-id={schoolId ?? undefined}
              data-all-schools-record-href={schoolId ? action.href : undefined}
              className="students-kanban-card__icon-btn"
              title={t(action.labelKey)}
              aria-label={t(action.labelKey)}
            >
              <KanbanQuickActionIcon action={action} />
            </Link>
          ))}

          {more.length > 0 ? (
            <div className="students-kanban-card__more" ref={menuRef}>
              <button
                type="button"
                className="students-kanban-card__icon-btn students-kanban-card__more-btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title={t('admin.studentsList.cardActionsMenu')}
                aria-label={t('admin.studentsList.cardActionsMenu')}
                onClick={openMenu}
              >
                <IconMoreHorizontal aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div
                  className={[
                    'students-kanban-card__menu',
                    menuUp ? 'students-kanban-card__menu--up' : 'students-kanban-card__menu--down',
                  ].join(' ')}
                  role="menu"
                >
                  {more.map((action) => (
                    <Link
                      key={action.id}
                      href={action.href}
                      data-all-schools-record-school-id={schoolId ?? undefined}
                      data-all-schools-record-href={schoolId ? action.href : undefined}
                      role="menuitem"
                      className="students-kanban-card__menu-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t(action.labelKey)}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
