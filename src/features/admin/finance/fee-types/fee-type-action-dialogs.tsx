'use client';

import { useEffect, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  feeTypeAllowsAction,
  feeTypeErrorMessageKey,
  resolveFeeTypeErrorCode,
} from '@/features/admin/finance/fee-types/normalize-fee-type';
import type { FeeType } from '@/types/finance';

export function FeeTypeArchiveDialog({
  open,
  feeType,
  onClose,
  onSuccess,
}: {
  open: boolean;
  feeType: FeeType;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  async function confirm() {
    if (loading || !feeTypeAllowsAction(feeType, 'archive')) return;
    setLoading(true);
    const res = await api.post(endpoints.admin.financeFeeTypeArchive(feeType.id));
    setLoading(false);
    if (res.success) {
      toast.success(t('admin.finance.feeTypesWorkspace.archiveSuccess'));
      onClose();
      onSuccess();
      return;
    }
    const code = resolveFeeTypeErrorCode(res.error.code);
    toast.error(code ? t(feeTypeErrorMessageKey(code)) : res.error.message);
  }

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.finance.feeTypesWorkspace.archiveTitle')}
      body={t('admin.finance.feeTypesWorkspace.archiveMessage')}
      variant="danger"
      loading={loading}
      confirmLabel={t('admin.finance.feeTypesWorkspace.archive')}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}

export function FeeTypeRestoreDialog({
  open,
  feeType,
  onClose,
  onSuccess,
}: {
  open: boolean;
  feeType: FeeType;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  async function confirm() {
    if (loading || !feeTypeAllowsAction(feeType, 'restore')) return;
    setLoading(true);
    const res = await api.post(endpoints.admin.financeFeeTypeRestore(feeType.id));
    setLoading(false);
    if (res.success) {
      toast.success(t('admin.finance.feeTypesWorkspace.restoreSuccess'));
      onClose();
      onSuccess();
      return;
    }
    const code = resolveFeeTypeErrorCode(res.error.code);
    toast.error(code ? t(feeTypeErrorMessageKey(code)) : res.error.message);
  }

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.finance.feeTypesWorkspace.restoreTitle')}
      body={t('admin.finance.feeTypesWorkspace.restoreMessage')}
      loading={loading}
      confirmLabel={t('admin.finance.feeTypesWorkspace.restore')}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}
