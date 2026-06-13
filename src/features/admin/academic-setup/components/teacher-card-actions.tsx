'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { MobileBottomSheet } from '@/components/ui/mobile-bottom-sheet';
import { useT } from '@/features/i18n/locale-context';
import type { Teacher } from '@/types/teacher';

const MOBILE_MEDIA = '(max-width: 639px)';

export function TeacherCardActions({
  teacher,
  canManage,
  canManageAssignments,
  onView,
  onEdit,
  onManageAssignments,
  onArchive,
}: {
  teacher: Teacher;
  canManage: boolean;
  canManageAssignments: boolean;
  onView: () => void;
  onEdit?: () => void;
  onManageAssignments?: () => void;
  onArchive?: () => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const showEdit = canManage && !!onEdit && teacher.status !== 'archived';
  const showAssignments = canManageAssignments && !!onManageAssignments;
  const showArchive = canManage && !!onArchive && teacher.status !== 'archived';
  const hasMenuItems = showEdit || showAssignments || showArchive;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA);
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!menuOpen || mobile) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
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
  }, [menuOpen, mobile]);

  function closeMenu() {
    setMenuOpen(false);
  }

  function menuItems() {
    return (
      <>
        {showEdit && (
          <button
            type="button"
            role="menuitem"
            className="academic-setup-level-actions__item"
            onClick={() => {
              closeMenu();
              onEdit?.();
            }}
          >
            {t('admin.academicSetup.editTeacher')}
          </button>
        )}
        {showAssignments && (
          <button
            type="button"
            role="menuitem"
            className="academic-setup-level-actions__item"
            onClick={() => {
              closeMenu();
              onManageAssignments?.();
            }}
          >
            {t('admin.academicSetup.manageAssignments')}
          </button>
        )}
        {showArchive && (
          <button
            type="button"
            role="menuitem"
            className="academic-setup-level-actions__item academic-setup-level-actions__item--danger"
            onClick={() => {
              closeMenu();
              onArchive?.();
            }}
          >
            {t('admin.archive')}
          </button>
        )}
      </>
    );
  }

  return (
    <div className="academic-teacher-card__footer">
      <button
        type="button"
        className="btn btn--ghost btn--sm academic-teacher-card__details-btn"
        style={{ minHeight: 44 }}
        onClick={onView}
      >
        {t('admin.academicSetup.viewTeacherDetails')}
      </button>
      {hasMenuItems && (
        <div className="academic-teacher-card__menu-wrap" ref={rootRef}>
          <button
            type="button"
            className="btn btn--ghost btn--sm academic-teacher-card__menu"
            style={{ minHeight: 44 }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('admin.academicSetup.teacherActionsMenu')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <IconMoreHorizontal size={16} />
          </button>
          {menuOpen && !mobile && (
            <div className="academic-setup-level-actions__menu academic-teacher-card__dropdown" role="menu">
              {menuItems()}
            </div>
          )}
          <MobileBottomSheet
            open={menuOpen && mobile}
            onClose={closeMenu}
            title={t('admin.academicSetup.teacherActionsMenu')}
            closeLabel={t('common.close')}
          >
            <div className="col" style={{ gap: 4 }} role="menu">
              {menuItems()}
            </div>
          </MobileBottomSheet>
        </div>
      )}
    </div>
  );
}

export function TeacherCardContextLinks({
  teacherId,
  canManageAssignments,
}: {
  teacherId: number;
  canManageAssignments: boolean;
}) {
  const t = useT();
  if (!canManageAssignments) return null;
  return (
    <Link
      href={`/admin/settings/academic-setup/assignments?view=teacher&teacher_id=${teacherId}`}
      className="academic-teacher-card__link tiny"
    >
      {t('admin.academicSetup.manageAssignments')}
    </Link>
  );
}
