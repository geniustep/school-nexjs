'use client';

import { useEffect } from 'react';
import { useT } from '@/features/i18n/locale-context';
import './setup-drawer.css';

export function SetupDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = 'default',
  className,
  iconClose = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'default' | 'medium' | 'wide' | 'collection';
  className?: string;
  iconClose?: boolean;
}) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="academic-setup-drawer-backdrop"
        role="presentation"
        onClick={onClose}
      />
      <aside
        className={`academic-setup-drawer${
          size === 'wide'
            ? ' academic-setup-drawer--wide'
            : size === 'medium'
              ? ' academic-setup-drawer--medium'
              : size === 'collection'
                ? ' academic-setup-drawer--collection'
                : ''
        }${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="academic-setup-drawer__head">
          <div className="academic-setup-drawer__head-text">
            <strong>{title}</strong>
            {subtitle ? <span className="tiny muted academic-setup-drawer__subtitle" dir="auto">{subtitle}</span> : null}
          </div>
          <button
            type="button"
            className={`btn btn--ghost btn--sm${iconClose ? ' academic-setup-drawer__close-icon' : ''}`}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            {iconClose ? <span aria-hidden>×</span> : t('common.close')}
          </button>
        </div>
        <div className={`academic-setup-drawer__body academic-setup-drawer__body--scroll${footer ? ' academic-setup-drawer__body--with-footer' : ''}`}>
          {children}
        </div>
        {footer ? <div className="academic-setup-drawer__footer">{footer}</div> : null}
      </aside>
    </>
  );
}
