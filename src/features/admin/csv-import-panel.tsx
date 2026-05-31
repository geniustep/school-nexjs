'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';

export interface ImportRowError {
  row?: number;
  field?: string;
  message?: string;
}

export interface ImportResult {
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  errors?: ImportRowError[];
}

interface CsvImportPanelProps {
  importPath: string;
  instructions?: string;
  onDone?: () => void;
}

export function CsvImportPanel({ importPath, instructions, onDone }: CsvImportPanelProps) {
  const t = useT();
  const toast = useToast();
  const [csv, setCsv] = useState('');
  const [validateOnly, setValidateOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function runImport() {
    if (!csv.trim()) {
      toast.error(t('admin.importCsvRequired'));
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await api.post<ImportResult>(importPath, { csv: csv.trim(), validate_only: validateOnly });
    setLoading(false);
    if (res.success && res.data) {
      setResult(res.data);
      if (validateOnly) {
        toast.success(t('admin.importValidated'));
      } else {
        toast.success(t('admin.importDone'));
        onDone?.();
      }
    } else if (!res.success) {
      toast.error(res.error.message);
      const details = res.error.details as { errors?: ImportRowError[] } | undefined;
      if (details?.errors?.length) {
        setResult({ errors: details.errors, failed: details.errors.length });
      }
    }
  }

  return (
    <Card className="mb-2">
      <SectionHead title={t('admin.importCsv')} />
      <div className="col mt-2" style={{ gap: 12 }}>
        {instructions && <p className="tiny muted">{instructions}</p>}
        <textarea
          className="textarea"
          rows={6}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={t('admin.importCsvPlaceholder')}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
        />
        <label className="row" style={{ gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={validateOnly}
            onChange={(e) => setValidateOnly(e.target.checked)}
          />
          <span className="tiny">{t('admin.validateOnly')}</span>
        </label>
        <button type="button" className="btn btn--primary btn--sm" disabled={loading} onClick={runImport}>
          {loading ? t('common.submitting') : validateOnly ? t('admin.validateImport') : t('admin.runImport')}
        </button>
        {result && (
          <div className="col" style={{ gap: 8 }}>
            <div className="row tiny muted" style={{ gap: 16, flexWrap: 'wrap' }}>
              {result.created != null && (
                <span>
                  {t('admin.importCreated')}: {result.created}
                </span>
              )}
              {result.updated != null && (
                <span>
                  {t('admin.importUpdated')}: {result.updated}
                </span>
              )}
              {result.skipped != null && (
                <span>
                  {t('admin.importSkipped')}: {result.skipped}
                </span>
              )}
              {result.failed != null && result.failed > 0 && (
                <span>
                  {t('admin.importFailed')}: {result.failed}
                </span>
              )}
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="col" style={{ gap: 4 }}>
                <strong className="tiny">{t('admin.importErrors')}</strong>
                {result.errors.map((err, i) => (
                  <div key={i} className="tiny muted mono">
                    {t('admin.importErrorRow', {
                      row: err.row ?? '?',
                      field: err.field ?? '—',
                      message: err.message ?? '—',
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
