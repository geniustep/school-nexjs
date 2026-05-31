'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';

interface ConfirmActionButtonProps {
  label: string;
  confirmMessage: string;
  path: string;
  body?: unknown;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  onSuccess?: () => void;
}

export function ConfirmActionButton({
  label,
  confirmMessage,
  path,
  body,
  variant = 'ghost',
  disabled,
  onSuccess,
}: ConfirmActionButtonProps) {
  const t = useT();
  const toast = useToast();
  const [acting, setActing] = useState(false);

  async function run() {
    if (!window.confirm(confirmMessage)) return;
    setActing(true);
    const res = await api.post(path, body);
    setActing(false);
    if (res.success) {
      toast.success(t('admin.actionSuccess'));
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
    <button type="button" className={cls} disabled={disabled || acting} onClick={run}>
      {acting ? t('common.saving') : label}
    </button>
  );
}
