'use client';

import { useEffect, useRef, useState } from 'react';
import { SchoolSwitcher } from '@/components/admin/school-switcher';
import { RoleSwitcher } from '@/components/auth/role-switcher';
import { SignOutButton } from '@/components/layout/sign-out-button';
import { Avatar } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { isMultiSchoolAdmin } from '@/lib/admin/admin-ux';
import { shouldShowRoleSwitcher } from '@/lib/auth/active-role-workspace';
import type { CurrentUser } from '@/types/user';
import styles from './app-shell.module.css';

export function AdminAccountMenu({
  user,
  roleLabel,
  loggingOut,
  onLogout,
}: {
  user: CurrentUser;
  roleLabel: string;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.accountMenu} ref={rootRef}>
      <button
        type="button"
        className={styles.accountTrigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('admin.accountMenu')}
        onClick={() => setOpen((current) => !current)}
      >
        <Avatar name={user.name} />
        <span className={styles.accountChevron} aria-hidden="true">
          ⌄
        </span>
      </button>

      {open ? (
        <div className={styles.accountPanel} role="dialog" aria-label={t('admin.accountMenu')}>
          <div className={styles.accountProfile}>
            <Avatar name={user.name} />
            <div className={styles.accountProfileCopy}>
              <strong>{user.name}</strong>
              <span>{roleLabel}</span>
            </div>
          </div>

          {isMultiSchoolAdmin(user) ? (
            <div className={styles.accountField}>
              <span className={styles.accountFieldLabel}>{t('admin.activeSchool')}</span>
              <SchoolSwitcher hideLabel />
            </div>
          ) : null}

          {shouldShowRoleSwitcher(user) ? (
            <div className={styles.accountField} data-testid="role-switcher-account-menu">
              <RoleSwitcher data-testid="role-switcher-account-menu-control" />
            </div>
          ) : null}

          <SignOutButton
            loggingOut={loggingOut}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={styles.accountLogout}
            block
          />
        </div>
      ) : null}
    </div>
  );
}
