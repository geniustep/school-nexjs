'use client';

import { ApiErrorView, LoadingState } from '@/components/states/states';
import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { useAdmissionPrefill } from '../hooks/use-admission-prefill';

function PrefillBlock({ title, data }: { title: string; data: unknown }) {
  if (!data || (typeof data === 'object' && Object.keys(data as object).length === 0)) {
    return null;
  }
  return (
    <div className="admissions-prefill-block">
      <h3 className="admissions-section__title">{title}</h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

/** Read-only preview — does NOT create student, guardian, or enrollment. No link-student. */
export function AdmissionPrefillTab({
  admissionId,
  enabled,
}: {
  admissionId: string;
  enabled: boolean;
}) {
  const t = useT();
  const { loading, data, error, load, loaded } = useAdmissionPrefill(admissionId, enabled);

  if (!enabled) {
    return (
      <p className="muted">{t('admin.admissions.prefill.notAllowed')}</p>
    );
  }

  if (loading && !loaded) {
    return <LoadingState label={t('admin.admissions.prefill.loading')} />;
  }

  if (error) {
    return <ApiErrorView error={error} onRetry={load} />;
  }

  if (!data) {
    return (
      <button type="button" className="btn btn--primary btn--sm" onClick={load}>
        {t('admin.admissions.prefill.load')}
      </button>
    );
  }

  return (
    <div className="admissions-section">
      <InfoBanner
        title={t('admin.admissions.prefill.readOnlyTitle')}
        description={t('admin.admissions.prefill.readOnlyNotice')}
        tone="blue"
      />

      {(data.warnings?.length ?? 0) > 0 && (
        <div className="alert alert--warning">
          <strong>{t('admin.admissions.prefill.warnings')}</strong>
          <ul>
            {data.warnings!.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {(data.blocking_issues?.length ?? 0) > 0 && (
        <div className="alert alert--error">
          <strong>{t('admin.admissions.prefill.blockingIssues')}</strong>
          <ul>
            {data.blocking_issues!.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="admissions-prefill-preview">
        <PrefillBlock title={t('admin.admissions.prefill.student')} data={data.student} />
        <PrefillBlock title={t('admin.admissions.prefill.guardian')} data={data.guardian} />
        <PrefillBlock title={t('admin.admissions.prefill.academic')} data={data.academic} />
        <PrefillBlock title={t('admin.admissions.prefill.admission')} data={data.admission} />
        <PrefillBlock title={t('admin.admissions.prefill.readiness')} data={data.readiness} />
      </div>
    </div>
  );
}
