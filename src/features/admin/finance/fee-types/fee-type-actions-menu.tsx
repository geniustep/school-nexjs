'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconMoreHorizontal } from '@/components/icons/admin-icons';
import { useT } from '@/features/i18n/locale-context';
import { feeTypeAllowsAction } from '@/features/admin/finance/fee-types/normalize-fee-type';
import type { FeeType, FeeTypeAction } from '@/types/finance';

export function FeeTypeActionsMenu({
  feeType,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  feeType: FeeType;
  onView: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const items: Array<{ action: FeeTypeAction; label: string; onClick: () => void; danger?: boolean }> = [];
  if (feeTypeAllowsAction(feeType, 'view')) {
    items.push({
      action: 'view',
      label: t('admin.finance.feeTypesWorkspace.viewDetails'),
      onClick: onView,
    });
  }
  if (feeTypeAllowsAction(feeType, 'edit')) {
    items.push({
      action: 'edit',
      label: t('common.edit'),
      onClick: onEdit,
    });
  }
  if (feeTypeAllowsAction(feeType, 'archive')) {
    items.push({
      action: 'archive',
      label: t('admin.finance.feeTypesWorkspace.archive'),
      onClick: onArchive,
    });
  }
  if (feeTypeAllowsAction(feeType, 'restore')) {
    items.push({
      action: 'restore',
      label: t('admin.finance.feeTypesWorkspace.restore'),
      onClick: onRestore,
    });
  }
  if (feeTypeAllowsAction(feeType, 'delete')) {
    items.push({
      action: 'delete',
      label: t('admin.finance.feeTypesWorkspace.delete'),
      onClick: onDelete,
      danger: true,
    });
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fee-type-actions-menu" ref={rootRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="btn btn--ghost btn--sm fee-type-actions-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('admin.finance.feeTypesWorkspace.actionsMenu')}
        onClick={() => setOpen((v) => !v)}
      >
        <IconMoreHorizontal size={16} aria-hidden />
      </button>
      {open ? (
        <div className="fee-type-actions-menu__panel" role="menu">
          {items.map((item) => (
            <button
              key={item.action}
              type="button"
              className={`fee-type-actions-menu__item${item.danger ? ' fee-type-actions-menu__item--danger' : ''}`}
              role="menuitem"
              onClick={() => run(item.onClick)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
