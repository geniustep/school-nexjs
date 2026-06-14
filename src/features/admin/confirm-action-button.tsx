'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface ConfirmActionButtonProps {
  label: string;
  confirmMessage: string;
  confirmTitle?: string;
  path: string;
  body?: unknown;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  onSuccess?: () => void;
}

export function ConfirmActionButton({
  label,
  confirmMessage,
  confirmTitle,
  path,
  body,
  variant = 'ghost',
  disabled,
  onSuccess,
}: ConfirmActionButtonProps) {
  const t = useT();
  const toast = useToast();
  const [acting, setActing] = useState(false);
  const [open, setOpen] = useState(false);

  async function run() {
    setActing(true);
    const res = await api.post(path, body);
    setActing(false);
    if (res.success) {
      toast.success(t('admin.actionSuccess'));
      setOpen(false);
      onSuccess?.();
    } else {
      toast.error(res.error.message);
    }
  }

  const cls =
    variant === 'primary'
      ? 'btn btn--primary btn--sm'
      : variant === 'danger'
        ? 'btn btn--sm'
        : 'btn btn--ghost btn--sm';

  return (
    <>
      <button type="button" className={cls} disabled={disabled || acting} onClick={() => setOpen(true)}>
        {acting ? t('common.saving') : label}
      </button>
      <ConfirmationDialog
        open={open}
        title={confirmTitle ?? t('common.confirm')}
        body={confirmMessage}
        variant={variant === 'danger' ? 'danger' : 'primary'}
        loading={acting}
        onConfirm={run}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
