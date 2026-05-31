'use client';

import { useState } from 'react';
import { downloadOfficialExport } from '@/lib/utils/export-download';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';

interface ExportButtonProps {
  path: string;
  filename: string;
  label?: string;
  official?: boolean;
}

export function ExportButton({
  path,
  filename,
  label,
  official = true,
}: ExportButtonProps) {
  const t = useT();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const res = await downloadOfficialExport(path, filename);
    setLoading(false);
    if (res.ok) {
      toast.success(t('academic.downloadStarted'));
    } else {
      toast.error(res.message);
    }
  }

  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      disabled={loading}
      onClick={handleExport}
      title={official ? t('admin.officialExport') : t('admin.clientExport')}
    >
      {loading ? t('common.downloading') : (label ?? t('admin.export'))}
    </button>
  );
}
