'use client';

import type { ClassLegacySubject, ClassLevelSubjectOption } from '../utils/class-level-subjects';

type Translate = (key: string) => string;

export function ClassSubjectsField({
  t,
  loading,
  error,
  options,
  legacy,
  selectedIds,
  onToggle,
  onRetry,
}: {
  t: Translate;
  loading: boolean;
  error: unknown;
  options: ClassLevelSubjectOption[];
  legacy: ClassLegacySubject[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onRetry: () => void;
}) {
  return (
    <div className="col" style={{ gap: 8 }}>
      {legacy.length > 0 && (
        <div className="col" style={{ gap: 6 }} role="group" aria-label={t('admin.academicSetup.classLegacySubjectsLabel')}>
          <span className="tiny muted">{t('admin.academicSetup.classLegacySubjectsLabel')}</span>
          {legacy.map((subject) => (
            <label key={`legacy-${subject.id}`} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={selectedIds.includes(subject.id)}
                onChange={() => onToggle(subject.id)}
              />
              <span className="col" style={{ gap: 2 }}>
                <span>{subject.name}</span>
                {subject.code ? (
                  <span className="tiny muted mono" dir="ltr">
                    {subject.code}
                  </span>
                ) : null}
                <span className="tiny" style={{ color: 'var(--warning, #b45309)' }}>
                  {t('admin.academicSetup.classLegacySubjectWarning')}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {loading ? (
        <div className="col" style={{ gap: 6 }} aria-busy="true" aria-live="polite">
          <div className="skeleton" style={{ height: 18, width: '70%' }} />
          <div className="skeleton" style={{ height: 18, width: '55%' }} />
          <div className="skeleton" style={{ height: 18, width: '60%' }} />
          <span className="tiny muted">{t('common.loading')}</span>
        </div>
      ) : error ? (
        <div className="col" style={{ gap: 8 }} role="alert">
          <span className="tiny" style={{ color: 'var(--danger, #b91c1c)' }}>
            {t('admin.academicSetup.classSubjectsLoadError')}
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            {t('common.retry')}
          </button>
        </div>
      ) : options.length === 0 ? (
        <div className="col" style={{ gap: 4 }}>
          <span>{t('admin.academicSetup.noSubjectsForLevel')}</span>
          <span className="tiny muted">{t('admin.academicSetup.classLevelSubjectsEmptyHint')}</span>
        </div>
      ) : (
        <div className="col" style={{ gap: 6, maxHeight: 160, overflow: 'auto' }}>
          {options.map((subject) => (
            <label key={subject.id} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={selectedIds.includes(subject.id)}
                onChange={() => onToggle(subject.id)}
              />
              <span className="col" style={{ gap: 2 }}>
                <span>{subject.name}</span>
                <span className="tiny muted mono" dir="ltr">
                  {subject.code}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
