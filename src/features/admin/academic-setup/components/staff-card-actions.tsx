'use client';

import { useEffect, useRef, useState } from 'react';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { MobileBottomSheet } from '@/components/ui/mobile-bottom-sheet';
import { useT } from '@/features/i18n/locale-context';
import {
  staffShowsDeactivate,
  staffShowsReactivate,
} from '@/features/admin/academic-setup/components/staff-reactivate-dialog';
import type { StaffMember } from '@/types/academic-setup';

const MOBILE_MEDIA = '(max-width: 639px)';

export function StaffCardActions({
  member,
  canManage,
  onView,
  onEdit,
  onReactivate,
  onDeactivate,
}: {
  member: StaffMember;
  canManage: boolean;
  onView: () => void;
  onEdit?: () => void;
  onReactivate?: () => void;
  onDeactivate?: () => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const showReactivate = staffShowsReactivate(member, canManage) && !!onReactivate;
  const showDeactivate = staffShowsDeactivate(member, canManage) && !!onDeactivate;
  const showEdit = canManage && !!onEdit && !showReactivate;
  const hasMenuItems = showEdit || showReactivate || showDeactivate;

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
            {t('admin.academicSetup.editStaff')}
          </button>
        )}
        {showReactivate && (
          <button
            type="button"
            role="menuitem"
            className="academic-setup-level-actions__item"
            onClick={() => {
              closeMenu();
              onReactivate?.();
            }}
          >
            {t('admin.academicSetup.reactivateStaff')}
          </button>
        )}
        {showDeactivate && (
          <button
            type="button"
            role="menuitem"
            className="academic-setup-level-actions__item academic-setup-level-actions__item--danger"
            onClick={() => {
              closeMenu();
              onDeactivate?.();
            }}
          >
            {t('admin.academicSetup.deactivateStaff')}
          </button>
        )}
      </>
    );
  }

  return (
    <div className="academic-staff-card__footer">
      <button
        type="button"
        className="btn btn--ghost btn--sm academic-staff-card__details-btn"
        style={{ minHeight: 44 }}
        onClick={onView}
      >
        {t('admin.academicSetup.viewStaffDetails')}
      </button>
      {hasMenuItems && (
        <div className="academic-staff-card__menu-wrap" ref={rootRef}>
          <button
            type="button"
            className="btn btn--ghost btn--sm academic-staff-card__menu"
            style={{ minHeight: 44 }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('admin.academicSetup.staffActionsMenu')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <IconMoreHorizontal size={16} />
          </button>
          {menuOpen && !mobile && (
            <div className="academic-setup-level-actions__menu academic-staff-card__dropdown" role="menu">
              {menuItems()}
            </div>
          )}
          <MobileBottomSheet
            open={menuOpen && mobile}
            onClose={closeMenu}
            title={t('admin.academicSetup.staffActionsMenu')}
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
