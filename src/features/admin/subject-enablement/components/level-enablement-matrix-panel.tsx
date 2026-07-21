'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { SubjectLevelEnablementMatrix } from '@/types/subject-enablement';
import { getSubjectEnablementWriteCapability } from '@/types/subject-enablement';
import { filterEnablementRows } from '../utils/build-enablement-matrix';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function LevelEnablementMatrixPanel({
  matrix,
  loading,
  error,
  onRetry,
  t: tProp,
}: {
  matrix: SubjectLevelEnablementMatrix | null;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  t?: Translate;
}) {
  const tHook = useT();
  const t = tProp ?? tHook;
  const [search, setSearch] = useState('');
  const write = getSubjectEnablementWriteCapability();

  const rows = useMemo(
    () => (matrix ? filterEnablementRows(matrix.rows, search) : []),
    [matrix, search],
  );

  if (loading) {
    return (
      <div className="col" style={{ gap: 8 }} aria-busy="true">
        <div className="skeleton" style={{ height: 18, width: '60%' }} />
        <div className="skeleton" style={{ height: 18, width: '80%' }} />
        <div className="skeleton" style={{ height: 18, width: '70%' }} />
        <span className="tiny muted">{t('common.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col" style={{ gap: 8 }} role="alert">
        <span>{t('admin.subjectEnablement.loadError')}</span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!matrix) {
    return <span className="tiny muted">{t('admin.selectLevel')}</span>;
  }

  if (matrix.counts.operationalActive === 0) {
    return (
      <div className="academic-setup-gap-banner" role="status">
        <p>{t('admin.subjectEnablement.noOperationalSubjects')}</p>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 12 }}>
      {!write.canManageOperationalEnablementMatrix && (
        <div className="academic-setup-gap-banner" role="status">
          <p>
            <strong>{t('admin.subjectEnablement.readOnlyTitle')}</strong>
          </p>
          <p className="tiny muted" style={{ marginTop: 4 }}>
            {t('admin.subjectEnablement.readOnlyHint')}
          </p>
        </div>
      )}

      <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          style={{ minWidth: 220, flex: 1 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.subjectEnablement.searchPlaceholder')}
          aria-label={t('admin.subjectEnablement.searchPlaceholder')}
        />
        <span className="tiny muted">
          {t('admin.subjectEnablement.levelCounts', {
            enabled: matrix.counts.enabled,
            notEnabled: matrix.counts.notEnabled,
            operational: matrix.counts.operationalActive,
          })}
        </span>
      </div>

      {matrix.counts.enabled === 0 ? (
        <p className="tiny muted" role="status">
          {t('admin.academicSetup.noSubjectsForLevel')}
        </p>
      ) : null}

      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th scope="col">{t('admin.subjectEnablement.colSubject')}</th>
              <th scope="col">{t('admin.subjectEnablement.colCode')}</th>
              <th scope="col">{t('admin.subjectEnablement.colStatus')}</th>
              <th scope="col">{t('admin.subjectEnablement.colSource')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.operationalSubjectId}>
                <td dir="auto">{row.name}</td>
                <td>
                  <span className="tiny muted mono" dir="ltr">
                    {row.code || '—'}
                  </span>
                </td>
                <td>
                  {row.status === 'enabled'
                    ? t('admin.subjectEnablement.statusEnabled')
                    : t('admin.subjectEnablement.statusNotEnabled')}
                </td>
                <td className="tiny muted">
                  {row.source === 'track'
                    ? t('admin.subjectEnablement.sourceTrack')
                    : row.source === 'level'
                      ? t('admin.subjectEnablement.sourceLevel')
                      : t('common.dash')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
