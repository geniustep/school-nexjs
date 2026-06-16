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

export function FeeTypeDeleteDialog({
  open,
  feeType,
  onClose,
  onDeleted,
  onArchiveInstead,
}: {
  open: boolean;
  feeType: FeeType;
  onClose: () => void;
  onDeleted: () => void;
  onArchiveInstead?: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [confirmCode, setConfirmCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [inUseMessage, setInUseMessage] = useState<string | null>(null);
  const canArchiveInstead = feeTypeAllowsAction(feeType, 'archive');

  useEffect(() => {
    if (!open) {
      setConfirmCode('');
      setLoading(false);
      setInUseMessage(null);
    }
  }, [open]);

  const codeMatches = confirmCode.trim() === feeType.code.trim();
  const canDelete = feeTypeAllowsAction(feeType, 'delete');

  async function confirm() {
    if (loading || !canDelete || !codeMatches) return;
    setLoading(true);
    setInUseMessage(null);
    const res = await api.delete(endpoints.admin.financeFeeType(feeType.id));
    setLoading(false);
    if (res.success) {
      toast.success(t('admin.finance.feeTypesWorkspace.deleteSuccess'));
      onClose();
      onDeleted();
      return;
    }
    const code = resolveFeeTypeErrorCode(res.error.code);
    if (code === 'fee_type_in_use' || code === 'fee_type_delete_forbidden') {
      setInUseMessage(t('admin.finance.feeTypesWorkspace.deleteInUseMessage'));
      return;
    }
    toast.error(code ? t(feeTypeErrorMessageKey(code)) : res.error.message);
  }

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.finance.feeTypesWorkspace.deleteTitle')}
      body={
        <div className="fee-type-delete-dialog">
          <p>{t('admin.finance.feeTypesWorkspace.deleteMessage')}</p>
          <p className="mono muted" dir="ltr">
            {feeType.code}
          </p>
          <label className="fee-type-delete-dialog__confirm">
            <span>{t('admin.finance.feeTypesWorkspace.deleteConfirmCode')}</span>
            <input
              className="input mono"
              dir="ltr"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {inUseMessage ? (
            <div className="fee-type-delete-dialog__blocked">
              <p className="form-error">{inUseMessage}</p>
              {canArchiveInstead && onArchiveInstead ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    onClose();
                    onArchiveInstead();
                  }}
                >
                  {t('admin.finance.feeTypesWorkspace.archiveInstead')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      }
      variant="danger"
      size="form"
      loading={loading}
      confirmLabel={t('admin.finance.feeTypesWorkspace.delete')}
      onConfirm={confirm}
      onClose={onClose}
    />
  );
}
