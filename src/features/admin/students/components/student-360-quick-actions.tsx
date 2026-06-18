'use client';

import { useEffect, useRef, useState } from 'react';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { isRelationshipActive } from '../utils/relationship-types';
import type { Student360TabId } from '../utils/student-360-tabs';
import {
  resolveOverviewArchiveAllowed,
  resolveOverviewEditAllowed,
  resolveOverviewManageGuardiansAllowed,
} from '../utils/resolve-overview-allowed-actions';
import type { StudentOverviewData } from '@/types/student-overview';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';

export function Student360QuickActions({
  details,
  caps,
  overview,
  archived,
  onEdit,
  onOpenTab,
  onArchiveSuccess,
}: {
  details: StudentDetailsData;
  caps: StudentCapabilities;
  overview?: StudentOverviewData | null;
  archived: boolean;
  onEdit: () => void;
  onOpenTab: (tab: Student360TabId) => void;
  onArchiveSuccess: () => void;
}) {
  const t = useT();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const s = details.student;
  const canManage = resolveOverviewEditAllowed(overview, caps) && !archived;
  const canManageGuardians = resolveOverviewManageGuardiansAllowed(overview, caps);
  const canArchive = resolveOverviewArchiveAllowed(overview, caps) && !archived;

  const activeGuardians = details.guardian_relationships.filter((r) =>
    isRelationshipActive(r.state, r.active),
  );
  const hasEnrollment = !!details.current_enrollment;
  const missingDocs = details.document_summary?.missing_required ?? 0;
  const hasHealth = details.health_summary?.has_profile === true;

  useEffect(() => {
    if (!menuOpen) return;
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
  }, [menuOpen]);

  if (!canManage) return null;

  const secondaryActions: { key: string; label: string; onClick: () => void }[] = [];

  if (canManageGuardians && activeGuardians.length === 0) {
    secondaryActions.push({
      key: 'guardian',
      label: t('admin.student360.quickActions.addGuardian'),
      onClick: () => onOpenTab('guardians'),
    });
  }
  if (!hasEnrollment) {
    secondaryActions.push({
      key: 'enrollment',
      label: t('admin.student360.quickActions.createEnrollment'),
      onClick: onEdit,
    });
  }
  if (caps.can_manage_documents === true && missingDocs > 0) {
    secondaryActions.push({
      key: 'document',
      label: t('admin.student360.quickActions.addDocument'),
      onClick: () => onOpenTab('documents'),
    });
  }
  if (!hasHealth && caps.can_manage_health === true) {
    secondaryActions.push({
      key: 'health',
      label: t('admin.student360.quickActions.createHealth'),
      onClick: () => onOpenTab('health'),
    });
  }
  return (
    <div className="student-360-quick-actions" ref={rootRef}>
      <button type="button" className="btn btn--primary btn--sm" onClick={onEdit}>
        {t('admin.student360.quickActions.editProfile')}
      </button>

      {secondaryActions.slice(0, 1).map((action) => (
        <button
          key={action.key}
          type="button"
          className="btn btn--ghost btn--sm student-360-quick-actions__secondary"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}

      <div className="student-360-quick-actions__more">
        <button
          type="button"
          className="btn btn--ghost btn--sm student-360-quick-actions__more-btn"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <IconMoreHorizontal aria-hidden="true" />
          <span className="visually-hidden">{t('admin.student360.quickActions.more')}</span>
        </button>
        {menuOpen ? (
          <div className="student-360-quick-actions__menu" role="menu">
            {secondaryActions.slice(1).map((action) => (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                className="student-360-quick-actions__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  action.onClick();
                }}
              >
                {action.label}
              </button>
            ))}
            {canArchive ? (
              <div className="student-360-quick-actions__menu-archive" role="none">
                <ConfirmActionButton
                  label={t('admin.archive')}
                  confirmMessage={t('admin.confirmArchive')}
                  path={endpoints.admin.studentArchive(s.id)}
                  variant="danger"
                  onSuccess={() => {
                    setMenuOpen(false);
                    onArchiveSuccess();
                  }}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
