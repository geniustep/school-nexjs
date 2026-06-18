'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { useStudentHealth } from '../hooks/use-student-health';
import { useStudentOptions } from '../hooks/use-student-options';
import {
  criticalItemFieldKeys,
  resolveHealthAlertPresentation,
} from '../utils/normalize-student-health';
import { Student360CompactEmpty } from './student-360-compact-empty';
import { StudentHealthAlertBanners } from './student-health-alert-banners';
import { StudentHealthEditDialog } from './student-health-edit-dialog';
import { StudentHealthProfileView } from './student-health-profile-view';

export function StudentHealthTab({
  studentId,
  canManage,
  onChanged,
}: {
  studentId: number;
  canManage: boolean;
  onChanged: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const healthState = useStudentHealth(studentId, true);
  const optionsState = useStudentOptions();
  const [editOpen, setEditOpen] = useState(false);

  const bloodTypes = optionsState.options?.bloodTypes ?? [];
  const profile = healthState.data?.profile ?? null;
  const alertPresentation = useMemo(() => resolveHealthAlertPresentation(profile), [profile]);
  const criticalFieldKeys = useMemo(
    () => criticalItemFieldKeys(alertPresentation.criticalItems),
    [alertPresentation.criticalItems],
  );

  useEffect(() => {
    if (!alertPresentation.showCritical) return;
    const target = document.getElementById('student-health-critical');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [alertPresentation.showCritical, profile?.student_id]);

  function bloodTypeLabel(value: string | null | undefined): string {
    if (!value) return t('common.dash');
    return bloodTypes.find((b) => b.value === value)?.label ?? value;
  }

  if (healthState.loading && !healthState.data) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (healthState.error) {
    if (healthState.error.code === 'student_health_forbidden' || healthState.error.code === 'forbidden') {
      return (
        <Student360CompactEmpty
          title={t('admin.student360.health.forbidden')}
          description={t('admin.student360.health.forbidden')}
        />
      );
    }
    return <ApiErrorView error={healthState.error} onRetry={healthState.reload} />;
  }

  return (
    <div className="student-health-tab student-360-tab-panel">
      <header className="student-health-tab__hero">
        <div className="student-health-tab__hero-main">
          <span className="student-health-tab__glyph" aria-hidden="true">
            ✚
          </span>
          <div>
            <p className="student-health-tab__eyebrow">{t('admin.student360.pages.health.title')}</p>
            <h1 className="student-health-tab__title">{t('admin.student360.health.title')}</h1>
            <p className="student-health-tab__desc">{t('admin.student360.pages.health.description')}</p>
          </div>
        </div>
        <div className="student-health-tab__hero-actions">
          {profile && canManage ? (
            <button type="button" className="student-health-tab__edit-btn" onClick={() => setEditOpen(true)}>
              {t('admin.student360.health.editProfile')}
            </button>
          ) : null}
          {!profile && canManage ? (
            <button
              type="button"
              className="student-health-tab__edit-btn student-health-tab__edit-btn--primary"
              onClick={() => setEditOpen(true)}
            >
              {t('admin.student360.health.createProfile')}
            </button>
          ) : null}
        </div>
      </header>

      {profile ? (
        <StudentHealthAlertBanners
          showCritical={alertPresentation.showCritical}
          showWarning={alertPresentation.showWarning}
          showCalm={alertPresentation.showCalm}
          criticalItems={alertPresentation.criticalItems}
        />
      ) : null}

      {!profile ? (
        <Student360CompactEmpty
          title={t('admin.student360.health.noProfile')}
          description={t('admin.student360.health.noProfileDesc')}
          action={
            canManage ? (
              <button
                type="button"
                className="student-health-tab__edit-btn student-health-tab__edit-btn--primary"
                onClick={() => setEditOpen(true)}
              >
                {t('admin.student360.health.createProfile')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <StudentHealthProfileView
          profile={profile}
          bloodTypeLabel={bloodTypeLabel(profile.blood_type)}
          criticalFieldKeys={criticalFieldKeys}
          showCriticalStyling={alertPresentation.showCritical}
        />
      )}

      <StudentHealthEditDialog
        open={editOpen}
        studentId={studentId}
        profile={profile}
        bloodTypes={bloodTypes}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          toast.success(t('admin.student360.health.saveSuccess'));
          healthState.reload();
          onChanged();
        }}
      />
    </div>
  );
}
