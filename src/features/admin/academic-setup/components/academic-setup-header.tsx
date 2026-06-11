'use client';

import Link from 'next/link';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { useT } from '@/features/i18n/locale-context';
import type { SetupReadiness } from '../types';
import { readinessTone } from '../utils/readiness';

export function AcademicSetupHeader({
  readiness,
  blockingCount,
}: {
  readiness: SetupReadiness;
  blockingCount: number;
}) {
  const t = useT();
  const user = useSession();
  const { activeSchoolId, schools } = useAdminSession();
  const activeRef = schools.find((s) => s.id === activeSchoolId) ?? user.school ?? null;
  const schoolLabel = formatSchoolLabel(activeRef, t);
  const tone = readiness.hasData ? readinessTone(readiness.percent) : 'amber';

  return (
    <div className="academic-setup-header">
      <Link href="/admin/settings" className="academic-setup__back">
        ‹ {t('admin.settings.backToSettings')}
      </Link>
      <div className="academic-setup-header__meta">
        <span className="muted">
          {t('admin.academicSetup.activeSchool')}: <strong>{schoolLabel}</strong>
        </span>
      </div>
      <div className="academic-setup-progress" role="status">
        <div className={cnRing(tone)}>
          {readiness.hasData ? `${readiness.percent}%` : '—'}
        </div>
        <div>
          <strong>{t('admin.academicSetup.readinessTitle')}</strong>
          <p className="muted tiny mt-2">
            {readiness.hasData
              ? blockingCount > 0
                ? t('admin.academicSetup.readinessRemaining', { count: blockingCount })
                : t('admin.academicSetup.readinessComplete')
              : t('admin.academicSetup.readinessNoData')}
          </p>
        </div>
      </div>
    </div>
  );
}

function cnRing(tone: 'green' | 'amber' | 'red') {
  return `academic-setup-progress__ring academic-setup-progress__ring--${tone}`;
}
