'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { Badge } from '@/components/ui/primitives';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import { getStudentDisplayName } from '@/lib/utils/student';
import { studentClassLabel, studentLevelLabel } from '../utils/student-academic-labels';
import { resolveStudentKanbanQuickActions } from '../utils/student-kanban-card-actions';
import { StudentPhotoVisual } from './student-photo-visual';
import type { Student } from '@/types/student';

export function StudentsKanbanCard({ student }: { student: Student }) {
  const t = useT();
  const user = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = getStudentDisplayName(student);
  const profileHref = `/admin/students/${student.id}`;
  const classLabel = studentClassLabel(student.class);
  const levelLabel = studentLevelLabel(student.level);
  const hasSecondaryInfo = classLabel !== '—' || levelLabel !== '—';

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

  return (
    <article className="students-kanban-card">
      <div className="students-kanban-card__identity">
        <Link
          href={profileHref}
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

        <Link href={profileHref} className="students-kanban-card__name" dir="auto" title={displayName}>
          {displayName}
        </Link>

        {hasSecondaryInfo ? (
          <p className="students-kanban-card__meta muted tiny">
            {levelLabel !== '—' ? levelLabel : null}
            {levelLabel !== '—' && classLabel !== '—' ? (
              <span className="students-kanban-card__meta-sep" aria-hidden="true">
                {' '}
                ·{' '}
              </span>
            ) : null}
            {classLabel !== '—' ? classLabel : null}
          </p>
        ) : null}

        <span className="students-kanban-card__status">
          <Badge tone={student.status === 'active' ? 'green' : 'slate'}>
            {statusLabel(t, student.status)}
          </Badge>
        </span>
      </div>

      {(visible.length > 0 || more.length > 0) && (
        <div className="students-kanban-card__actions">
          {visible.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="btn btn--ghost btn--sm students-kanban-card__quick"
            >
              {t(action.labelKey)}
            </Link>
          ))}

          {more.length > 0 ? (
            <div className="students-kanban-card__more" ref={menuRef}>
              <button
                type="button"
                className="btn btn--ghost btn--sm students-kanban-card__more-btn"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label={t('admin.studentsList.cardActionsMenu')}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <IconMoreHorizontal aria-hidden="true" />
              </button>
              {menuOpen ? (
                <div className="students-kanban-card__menu" role="menu">
                  {more.map((action) => (
                    <Link
                      key={action.id}
                      href={action.href}
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
