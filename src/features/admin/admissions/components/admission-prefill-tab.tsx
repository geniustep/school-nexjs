'use client';

import { ApiErrorView, LoadingState } from '@/components/states/states';
import { InfoBanner } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { useAdmissionPrefill } from '../hooks/use-admission-prefill';
import {
  formatPrefillMessage,
  hasPrefillSectionData,
  prefillSectionRows,
} from '../utils/admission-prefill-display';

function PrefillSection({
  title,
  section,
  data,
}: {
  title: string;
  section: 'student' | 'guardian' | 'academic' | 'admission';
  data: unknown;
}) {
  const t = useT();
  if (!hasPrefillSectionData(data)) return null;

  const rows = prefillSectionRows(section, data, t);
  if (!rows.length) return null;

  return (
    <section className="card admissions-prefill-block">
      <h3 className="admissions-prefill-block__title">{title}</h3>
      <dl className="admissions-prefill-block__dl">
        {rows.map(({ fieldKey, label, value, dir }) => (
          <div key={fieldKey} className="admissions-prefill-block__row">
            <dt>{label}</dt>
            <dd dir={dir}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Read-only preview — does NOT create student, guardian, or enrollment. */
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
    return <p className="muted">{t('admin.admissions.prefill.notAllowed')}</p>;
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
    <div className="admissions-prefill-tab">
      <InfoBanner
        title={t('admin.admissions.prefill.readOnlyTitle')}
        description={t('admin.admissions.prefill.readOnlyNotice')}
        tone="blue"
      />

      {(data.warnings?.length ?? 0) > 0 && (
        <div className="alert alert--warning" role="status">
          <strong>{t('admin.admissions.prefill.warnings')}</strong>
          <ul>
            {data.warnings!.map((w, i) => (
              <li key={i}>{formatPrefillMessage(w, t)}</li>
            ))}
          </ul>
        </div>
      )}

      {(data.blocking_issues?.length ?? 0) > 0 && (
        <div className="alert alert--error" role="alert">
          <strong>{t('admin.admissions.prefill.blockingIssues')}</strong>
          <ul>
            {data.blocking_issues!.map((w, i) => (
              <li key={i}>{formatPrefillMessage(w, t)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="admissions-prefill-preview">
        <PrefillSection title={t('admin.admissions.prefill.student')} section="student" data={data.student} />
        <PrefillSection title={t('admin.admissions.prefill.guardian')} section="guardian" data={data.guardian} />
        <PrefillSection title={t('admin.admissions.prefill.academic')} section="academic" data={data.academic} />
        <PrefillSection title={t('admin.admissions.prefill.admission')} section="admission" data={data.admission} />
      </div>
    </div>
  );
}
