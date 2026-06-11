'use client';

import Link from 'next/link';
import { InfoBanner } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadinessPayload } from '@/types/academic-setup';
import {
  readinessScoreLabel,
  readinessStatusLabel,
  readinessTone,
} from '../utils/readiness-present';

export function AcademicSetupHeader({ data }: { data: SetupReadinessPayload }) {
  const t = useT();
  const user = useSession();
  const { activeSchoolId, schools } = useAdminSession();
  const activeRef = schools.find((s) => s.id === activeSchoolId) ?? user.school ?? data.school ?? null;
  const schoolLabel = formatSchoolLabel(activeRef, t);
  const { readiness, scope } = data;
  const tone = readinessTone(readiness.status, readiness.score);

  return (
    <div className="academic-setup-header">
      <Link href="/admin/settings" className="academic-setup__back">
        ‹ {t('admin.settings.backToSettings')}
      </Link>
      <div className="academic-setup-header__meta">
        <span className="muted">
          {t('admin.academicSetup.activeSchool')}: <strong>{schoolLabel}</strong>
        </span>
        {readiness.ready_for_timetable_setup && (
          <span className="badge badge--green">{t('admin.academicSetup.readyForTimetable')}</span>
        )}
      </div>
      {!scope.is_full_school && (
        <InfoBanner
          tone="amber"
          icon="ℹ️"
          title={t('admin.academicSetup.scopedReadinessTitle')}
          description={t('admin.academicSetup.scopedReadinessDesc')}
        />
      )}
      <div className="academic-setup-progress" role="status">
        <div className={`academic-setup-progress__ring academic-setup-progress__ring--${tone}`}>
          {readiness.score}%
        </div>
        <div>
          <strong>{readinessStatusLabel(readiness.status, t)}</strong>
          <p className="muted tiny mt-2">{readinessScoreLabel(data, t)}</p>
          <p className="tiny muted">
            {t('admin.academicSetup.readinessCounts', {
              blocking: readiness.blocking_issues,
              warnings: readiness.warnings,
              info: readiness.information,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
