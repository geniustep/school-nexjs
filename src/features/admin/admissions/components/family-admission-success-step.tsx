'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { familyBatchApplicationReference } from '../utils/family-admission-normalize';
import { admissionUiStageTone, resolveAdmissionUiStage } from '../utils/admission-ui-stage';
import type { FamilyBatchCreateResponse } from '@/types/admission';

export function FamilyAdmissionSuccessStep({
  result,
  replay,
  onCreateAnother,
}: {
  result: FamilyBatchCreateResponse;
  replay: boolean;
  onCreateAnother: () => void;
}) {
  const t = useT();

  return (
    <section className="family-admission-step family-admission-success-step">
      <div className="family-admission-success">
        <h2 className="family-admission-success__title">
          {replay
            ? t('admin.admissions.family.successReplayTitle', {
                count: result.application_count,
              })
            : t('admin.admissions.family.successTitle', {
                count: result.application_count,
              })}
        </h2>

        <div className="family-admission-success__meta">
          <span className="mono">{result.family_reference}</span>
          <span className="muted">
            {t('admin.admissions.family.successFamilySize', { count: result.application_count })}
          </span>
        </div>

        <ul className="family-admission-success__list">
          {result.applications.map((app) => {
            const reference = familyBatchApplicationReference(app);
            const uiStage = resolveAdmissionUiStage(app);
            return (
              <li key={app.id} className="family-admission-success__item">
                <div className="family-admission-success__item-main">
                  <strong>{app.student_name}</strong>
                  <span className="mono">{reference}</span>
                  <Badge tone={admissionUiStageTone(uiStage)}>
                    {t(`admin.admissions.uiStages.${uiStage}`)}
                  </Badge>
                </div>
                <Link href={`/admin/admissions/${app.id}`} className="btn btn--ghost btn--sm">
                  {t('admin.admissions.family.openApplication')}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="family-admission-success__actions">
          <Link href="/admin/admissions" className="btn btn--primary">
            {t('admin.admissions.family.backToList')}
          </Link>
          <button type="button" className="btn btn--ghost" onClick={onCreateAnother}>
            {t('admin.admissions.family.createAnother')}
          </button>
        </div>
      </div>
    </section>
  );
}
