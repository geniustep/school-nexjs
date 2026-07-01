'use client';

import { useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { AdmissionDetail } from '@/types/admission';
import { canReopenAdmission } from '../utils/admission-rejection';
import { AdmissionReopenDialog } from './admission-reopen-dialog';

export function AdmissionReopenAction({
  detail,
  onUpdated,
  className,
}: {
  detail: AdmissionDetail;
  onUpdated: () => void;
  className?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  if (!canReopenAdmission(detail)) return null;

  return (
    <>
      <button
        type="button"
        className={className ?? 'btn btn--ghost btn--sm'}
        onClick={() => setOpen(true)}
      >
        {t('admin.admissions.rejection.reopenButton')}
      </button>
      <AdmissionReopenDialog
        admissionId={detail.id}
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={onUpdated}
      />
    </>
  );
}
