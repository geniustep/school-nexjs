'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/primitives';
import { MobileBottomSheet } from '@/components/ui/mobile-bottom-sheet';
import { SignOutButton } from '@/components/layout/sign-out-button';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';
import { SchoolSwitcher } from '@/components/admin/school-switcher';
import { useT } from '@/features/i18n/locale-context';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import type { CurrentUser } from '@/types/user';

export function AdminAccountSheet({
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
  const schoolLabel = user.school ? formatSchoolLabel(user.school, t) : null;

  return (
    <>
      <button
        type="button"
        className="admin-account-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('admin.accountMenu')}
        onClick={() => setOpen(true)}
      >
        <Avatar name={user.name} />
      </button>

      <MobileBottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('admin.accountMenu')}
        closeLabel={t('common.close')}
      >
        <div className="admin-account-sheet">
          <div className="admin-account-sheet__profile">
            <Avatar name={user.name} />
            <div className="admin-account-sheet__copy">
              <strong>{user.name}</strong>
              <span className="admin-account-sheet__role">{roleLabel}</span>
              {schoolLabel && (
                <span className="admin-account-sheet__school">{schoolLabel}</span>
              )}
            </div>
          </div>

          {user.role === 'admin' && (
            <div className="admin-account-sheet__field">
              <span className="admin-account-sheet__label">{t('admin.activeSchool')}</span>
              <SchoolSwitcher />
            </div>
          )}

          <div className="admin-account-sheet__field">
            <span className="admin-account-sheet__label">{t('common.language')}</span>
            <LocaleSwitcher />
          </div>

          <SignOutButton
            loggingOut={loggingOut}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="admin-account-sheet__logout"
            block
          />
        </div>
      </MobileBottomSheet>
    </>
  );
}
